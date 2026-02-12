import { Schema } from 'mongoose';
import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import { handleFileAttachments, Attachments } from '@/lib/fileUtils';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { AnyBulkWriteOperation } from 'mongodb';
import { getJobIdString } from '../utils';
import type {
  BulkAssignNotificationMeta,
  BulkAssignParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';

export async function runBulkAssign(
  params: BulkAssignParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const {
    candidateIds,
    interviewerId,
    time,
    attachments = [],
    scheduleGoogleMeet = false,
    meetDuration = 30,
    meetingNotes = '',
    meetingAttachments = [],
    additionalGuests = [],
    scheduleZoomMeet = false,
    zoomMeetDuration = 30,
    zoomMeetingNotes = '',
    zoomMeetingAttachments = [],
    zoomAdditionalGuests = [],
  } = params;
  const { user, dateTime, Candidate, History, User } = ctx;
  const toBroadcast: ICandidate[] = [];
  let failedCount = 0;

  const interviewer = await User.findById(interviewerId)
    .select('_id name email')
    .lean();
  if (!interviewer) {
    return {
      success: false,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'Interviewer not found',
    };
  }

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    isDeleted: { $ne: true },
  })
    .populate([
      { path: 'assignment.interviewerId', select: '_id name email' },
      { path: 'followUp.userId', select: '_id name email' },
      { path: 'jobId', select: '_id title description' },
    ])
    .lean();

  if (candidates.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'No candidates found',
    };
  }

  // Process attachments once (shared across all candidates)
  let processedAttachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }> = [];
  if (attachments.length > 0 && user.organizationId) {
    try {
      await connectToDatabase();
      const settings = await Settings?.findOne({
        organizationId: user.organizationId,
      })
        .select('fileStorage')
        .lean();
      const fileStorage = settings?.fileStorage?.storageType || 'local';

      const images = attachments.filter((att) => att.type.startsWith('image'));
      const files = attachments.filter((att) => !att.type.startsWith('image'));

      const attachmentsObj: Attachments = { files, images };
      const { files: processedFiles, images: processedImages } =
        await handleFileAttachments(
          attachmentsObj,
          fileStorage,
          user.organizationId,
        );
      processedAttachments = [...processedFiles, ...processedImages];
    } catch (err) {
      logger.error(
        { error: err },
        'Bulk assign: failed to process attachments',
      );
    }
  }

  // Process candidates: collect updates for batching
  const candidateUpdates: Array<{
    updateOne: {
      filter: { _id: string };
      update: { $set: { assignment: unknown; attachments: unknown[] } };
    };
  }> = [];
  const historyBulk: Array<{
    updateOne: {
      filter: { candidateId: string; jobId: string };
      update: { $push: { history: ICandidateHistory } };
      upsert: true;
    };
  }> = [];
  const ids: string[] = [];

  // Process each candidate to build updates (Google Meet must be per-candidate)
  for (const candidate of candidates) {
    try {
      const candidateId = (
        candidate._id as { toString: () => string }
      ).toString();
      const jobId = getJobIdString(candidate);
      const candidateObj = candidate as ICandidate;
      let previousInterviewerId: unknown = null;
      if (candidate.assignment?.interviewerId != null) {
        const a = candidate.assignment.interviewerId as { _id?: unknown };
        previousInterviewerId =
          typeof a === 'object' && a !== null && '_id' in a
            ? a._id
            : candidate.assignment.interviewerId;
      }

      // Merge attachments with existing candidate attachments
      const existingAttachments = candidateObj.attachments || [];
      const existingNames = new Set(existingAttachments.map((a) => a.name));
      const newAttachments = processedAttachments.filter(
        (a) => !existingNames.has(a.name),
      );
      const mergedAttachments = [...existingAttachments, ...newAttachments];

      // Schedule Google Calendar meeting if requested (per-candidate external API call)
      let googleMeetData: {
        eventId: string;
        meetingLink: string;
        htmlLink: string;
        summary: string;
        description: string;
        meetingNotes?: string;
        meetingAttachments?: typeof meetingAttachments;
      } | null = null;

      let zoomMeetData: {
        meetingId: string;
        meetingLink: string;
        startUrl?: string;
        eventId?: string;
        htmlLink?: string;
        summary?: string;
        description?: string;
        meetingNotes?: string;
        meetingAttachments?: typeof zoomMeetingAttachments;
      } | null = null;

      if (scheduleGoogleMeet && time && user.organizationId) {
        try {
          const guests = [
            ...((interviewer as { email?: string }).email
              ? [(interviewer as { email: string }).email]
              : []),
            ...(candidateObj.email ? [candidateObj.email] : []),
            ...(user.email &&
            user.email !== (interviewer as { email?: string }).email
              ? [user.email]
              : []),
            ...additionalGuests,
          ];

          const processedMeetingAttachments = await Promise.all(
            meetingAttachments.map(async (att) => {
              if (
                att.url &&
                !att.url.startsWith('data:') &&
                !att.url.startsWith('http')
              ) {
                return att;
              }
              return att;
            }),
          );

          const baseUrl =
            process.env.BASE_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000';
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (ctx.requestHeaders) {
            const authHeader =
              ctx.requestHeaders.get('authorization') ||
              ctx.requestHeaders.get('cookie');
            if (authHeader) {
              if (ctx.requestHeaders.get('authorization')) {
                headers.authorization =
                  ctx.requestHeaders.get('authorization')!;
              }
              if (ctx.requestHeaders.get('cookie')) {
                headers.cookie = ctx.requestHeaders.get('cookie')!;
              }
            }
          }

          const scheduleResponse = await fetch(
            `${baseUrl}/api/google-calendar/schedule-meet`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                candidateId,
                candidateName: candidateObj.name,
                candidateEmail: candidateObj.email,
                interviewerId,
                interviewerName: (interviewer as { name: string }).name,
                scheduledTime: time,
                duration: meetDuration,
                guests,
                jobTitle:
                  (candidateObj.jobId as { title?: string })?.title ||
                  'Position',
                organizationName:
                  user.organizationInfo?.name ||
                  user.organizationId ||
                  'Company',
                meetingNotes,
                meetingAttachments: processedMeetingAttachments,
              }),
            },
          );

          if (scheduleResponse.ok) {
            const scheduleResult = await scheduleResponse.json();
            googleMeetData = {
              eventId: scheduleResult.eventId,
              meetingLink: scheduleResult.meetingLink,
              htmlLink: scheduleResult.htmlLink,
              summary: scheduleResult.summary,
              description: scheduleResult.description,
              meetingNotes,
              meetingAttachments: processedMeetingAttachments,
            };
          } else {
            logger.error(
              { status: scheduleResponse.status, candidateId },
              'Bulk assign: failed to schedule Google Meet',
            );
          }
        } catch (err) {
          logger.error(
            { error: err, candidateId },
            'Bulk assign: Google Meet scheduling error',
          );
        }
      }

      if (scheduleZoomMeet && time && user.organizationId) {
        try {
          const guests = [
            ...((interviewer as { email?: string }).email
              ? [(interviewer as { email: string }).email]
              : []),
            ...(candidateObj.email ? [candidateObj.email] : []),
            ...(user.email &&
            user.email !== (interviewer as { email?: string }).email
              ? [user.email]
              : []),
            ...zoomAdditionalGuests,
          ];

          const processedZoomMeetingAttachments = await Promise.all(
            zoomMeetingAttachments.map(async (att) => {
              if (
                att.url &&
                !att.url.startsWith('data:') &&
                !att.url.startsWith('http')
              ) {
                return att;
              }
              return att;
            }),
          );

          const baseUrl =
            process.env.BASE_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000';
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (ctx.requestHeaders) {
            const authHeader =
              ctx.requestHeaders.get('authorization') ||
              ctx.requestHeaders.get('cookie');
            if (authHeader) {
              if (ctx.requestHeaders.get('authorization')) {
                headers.authorization =
                  ctx.requestHeaders.get('authorization')!;
              }
              if (ctx.requestHeaders.get('cookie')) {
                headers.cookie = ctx.requestHeaders.get('cookie')!;
              }
            }
          }

          const scheduleResponse = await fetch(
            `${baseUrl}/api/zoom/schedule-meet`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                candidateId,
                candidateName: candidateObj.name,
                candidateEmail: candidateObj.email,
                interviewerId,
                interviewerName: (interviewer as { name: string }).name,
                interviewerEmail: (interviewer as { email?: string }).email,
                scheduledTime: time,
                duration: zoomMeetDuration,
                guests,
                jobTitle:
                  (candidateObj.jobId as { title?: string })?.title ||
                  'Position',
                organizationName:
                  user.organizationInfo?.name ||
                  user.organizationId ||
                  'Company',
                meetingNotes: zoomMeetingNotes,
                meetingAttachments: processedZoomMeetingAttachments,
              }),
            },
          );

          if (scheduleResponse.ok) {
            const scheduleResult = await scheduleResponse.json();
            zoomMeetData = {
              meetingId: scheduleResult.meetingId,
              meetingLink: scheduleResult.meetingLink,
              startUrl: scheduleResult.startUrl,
              eventId: scheduleResult.eventId,
              htmlLink: scheduleResult.htmlLink,
              summary: scheduleResult.summary,
              description: scheduleResult.description,
              meetingNotes: zoomMeetingNotes,
              meetingAttachments: processedZoomMeetingAttachments,
            };
          } else {
            logger.error(
              { status: scheduleResponse.status, candidateId },
              'Bulk assign: failed to schedule Zoom meeting',
            );
          }
        } catch (err) {
          logger.error(
            { error: err, candidateId },
            'Bulk assign: Zoom scheduling error',
          );
        }
      }

      const meetingLinkLines: string[] = [];
      if (scheduleGoogleMeet && googleMeetData?.meetingLink) {
        meetingLinkLines.push(`Google Meet meeting link: ${googleMeetData.meetingLink}`);
      }
      if (scheduleZoomMeet && zoomMeetData?.meetingLink) {
        meetingLinkLines.push(`Zoom meeting link: ${zoomMeetData.meetingLink}`);
      }
      const meetingLinkNote = meetingLinkLines.join('\n');

      const historyEntry: ICandidateHistory = {
        dateTime,
        title: `Assigned to ${(interviewer as { name: string }).name} : Assigned by ${user.name}`,
        currentInterviewer: interviewerId as unknown as Schema.Types.ObjectId,
        previousInterviewer:
          previousInterviewerId as Schema.Types.ObjectId | null,
        assignmentBy: user.id ?? null,
        note: { description: meetingLinkNote, date: '', rating: 0, userId: null },
        attachments: processedAttachments,
      };

      const assignmentUpdate: {
        interviewerId: string;
        time: string | null;
        assignedAt: string;
        googleMeet?: typeof googleMeetData;
        zoomMeet?: typeof zoomMeetData;
      } = {
        interviewerId,
        time: time ?? null,
        assignedAt: dateTime,
      };

      if (googleMeetData) {
        assignmentUpdate.googleMeet = googleMeetData;
      }
      if (zoomMeetData) {
        assignmentUpdate.zoomMeet = zoomMeetData;
      }

      // Collect updates for batching
      candidateUpdates.push({
        updateOne: {
          filter: { _id: candidateId },
          update: {
            $set: {
              assignment: assignmentUpdate,
              attachments: mergedAttachments,
            },
          },
        },
      });

      if (jobId) {
        historyBulk.push({
          updateOne: {
            filter: { candidateId, jobId },
            update: { $push: { history: historyEntry } },
            upsert: true as const,
          },
        });
      }

      ids.push(candidateId);
    } catch (err) {
      logger.error(
        { error: err, candidateId: (candidate as { _id: unknown })._id },
        'Bulk assign: failed one candidate',
      );
      failedCount += 1;
    }
  }

  try {
    // Batch update candidates
    if (candidateUpdates.length > 0) {
      await Candidate.bulkWrite(
        candidateUpdates as unknown as AnyBulkWriteOperation<ICandidate>[],
      );
    }

    // Batch update history
    if (historyBulk.length > 0) {
      await History.bulkWrite(historyBulk);
    }

    // Single query to get all updated candidates
    const updatedList = await Candidate.find({ _id: { $in: ids } })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    toBroadcast.push(...(updatedList as ICandidate[]));

    const assignNotificationMeta =
      toBroadcast.length > 0
        ? {
            interviewerId,
            interviewerName: (interviewer as { name: string }).name,
            jobId: getJobIdString(toBroadcast[0] as ICandidate),
            jobTitle:
              (toBroadcast[0] as ICandidate).jobId != null &&
              typeof (toBroadcast[0] as ICandidate).jobId === 'object' &&
              'title' in ((toBroadcast[0] as ICandidate).jobId as object)
                ? String(
                    ((toBroadcast[0] as ICandidate).jobId as { title?: string })
                      .title ?? 'Job',
                  )
                : 'Job',
            candidates: toBroadcast.map((c) => ({
              candidateId:
                (c as unknown as { _id: unknown })._id?.toString() ?? '',
              candidateName: (c as ICandidate).name ?? 'Candidate',
            })),
          }
        : undefined;

    return {
      success: true,
      updatedCount: toBroadcast.length,
      failedCount,
      candidatesToBroadcast: toBroadcast,
      message: `Assigned ${toBroadcast.length} candidate(s)`,
      assignNotificationMeta: assignNotificationMeta as
        | BulkAssignNotificationMeta
        | undefined,
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk assign: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidates.length,
      candidatesToBroadcast: [],
      message: 'Assign failed',
    };
  }
}
