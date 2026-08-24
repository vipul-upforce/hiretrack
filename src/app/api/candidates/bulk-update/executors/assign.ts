import { Schema } from 'mongoose';
import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import { handleFileAttachments, Attachments } from '@/lib/fileUtils';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getJobIdString, transformCandidatesWithStatusNames } from '../utils';
import type {
  BulkAssignNotificationMeta,
  BulkAssignParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import {
  scheduleGoogleMeetForCandidate,
  scheduleZoomMeetForCandidate,
  scheduleTeamsMeetForCandidate,
} from './assign-helpers';

export async function runBulkAssign(
  params: BulkAssignParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const {
    candidateIds,
    interviewerId,
    time,
    remark,
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
    scheduleTeamsMeet = false,
    teamsMeetDuration = 30,
    teamsMeetingNotes = '',
    teamsMeetingAttachments = [],
    teamsAdditionalGuests = [],
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
    // isDeleted: { $ne: true },
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
      update: {
        $set: {
          assignment: unknown;
          attachments: unknown[];
          'tracking.updatedAt': Date;
        };
      };
    };
  }> = [];
  const historyBulk: Array<{
    updateOne: {
      filter: { candidateId: string };
      update: { $push: { history: ICandidateHistory } };
      upsert: true;
    };
  }> = [];
  const ids: string[] = [];

  /** Capture first candidate's meeting data for bulk email template variables */
  let firstMeetingLink: string | null = null;
  let firstOutlookLink: string | null = null;

  // Process each candidate to build updates (Google Meet must be per-candidate)
  for (const candidate of candidates) {
    try {
      const candidateId = (
        candidate._id as { toString: () => string }
      ).toString();
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
      let googleMeetData: Awaited<
        ReturnType<typeof scheduleGoogleMeetForCandidate>
      >['data'] = null;
      let zoomMeetData: Awaited<
        ReturnType<typeof scheduleZoomMeetForCandidate>
      >['data'] = null;
      let teamsMeetData: Awaited<
        ReturnType<typeof scheduleTeamsMeetForCandidate>
      >['data'] = null;

      if (scheduleGoogleMeet && time && user.organizationId) {
        const result = await scheduleGoogleMeetForCandidate(ctx, {
          candidateId,
          candidateObj,
          interviewerId,
          interviewerName: (interviewer as { name: string }).name,
          interviewerEmail: (interviewer as { email?: string }).email,
          time,
          meetDuration,
          meetingNotes,
          meetingAttachments,
          additionalGuests,
          user,
        });
        googleMeetData = result.data;
        if (result.meetingLink && !firstMeetingLink) {
          firstMeetingLink = result.meetingLink;
        }
        if (result.outlookCalendarLink && !firstOutlookLink) {
          firstOutlookLink = result.outlookCalendarLink;
        }
      }

      if (scheduleZoomMeet && time && user.organizationId) {
        const result = await scheduleZoomMeetForCandidate(ctx, {
          candidateId,
          candidateObj,
          interviewerId,
          interviewerName: (interviewer as { name: string }).name,
          interviewerEmail: (interviewer as { email?: string }).email,
          time,
          zoomMeetDuration,
          zoomMeetingNotes,
          zoomMeetingAttachments,
          zoomAdditionalGuests,
          user,
        });
        zoomMeetData = result.data;
        if (result.meetingLink && !firstMeetingLink) {
          firstMeetingLink = result.meetingLink;
        }
      }

      if (scheduleTeamsMeet && time && user.organizationId) {
        const result = await scheduleTeamsMeetForCandidate(ctx, {
          candidateId,
          candidateObj,
          interviewerId,
          interviewerName: (interviewer as { name: string }).name,
          interviewerEmail: (interviewer as { email?: string }).email,
          time,
          teamsMeetDuration,
          teamsMeetingNotes,
          teamsMeetingAttachments,
          teamsAdditionalGuests,
          user,
        });
        teamsMeetData = result.data;
        if (result.meetingLink && !firstMeetingLink) {
          firstMeetingLink = result.meetingLink;
        }
      }

      const meetingLinkLines: string[] = [];
      if (scheduleGoogleMeet && googleMeetData?.meetingLink) {
        meetingLinkLines.push(
          `Google Meet meeting link: ${googleMeetData.meetingLink}`,
        );
      }
      if (scheduleZoomMeet && zoomMeetData?.meetingLink) {
        meetingLinkLines.push(`Zoom meeting link: ${zoomMeetData.meetingLink}`);
      }
      if (scheduleTeamsMeet && teamsMeetData?.meetingLink) {
        meetingLinkLines.push(
          `Microsoft Teams meeting link: ${teamsMeetData.meetingLink}`,
        );
      }
      const meetingLinkNote = meetingLinkLines.join('\n');
      const noteDescription = [meetingLinkNote, remark?.trim()]
        .filter(Boolean)
        .join('\n\n');
      const hasCombinedRemark = !!remark?.trim();

      const historyEntry: ICandidateHistory = {
        dateTime,
        title: `Assigned to ${(interviewer as { name: string }).name} : Assigned by ${user.name}`,
        currentInterviewer: interviewerId as unknown as Schema.Types.ObjectId,
        previousInterviewer:
          previousInterviewerId as Schema.Types.ObjectId | null,
        assignmentBy: user.id ?? null,
        note: {
          description: noteDescription,
          date: '',
          rating: 0,
          userId: null,
          isPrivate: hasCombinedRemark, // Hide remark from interviewer when combined
        },
        attachments: processedAttachments,
      };

      const assignmentUpdate: {
        interviewerId: string;
        time: string | null;
        assignedAt: string;
        googleMeet?: typeof googleMeetData;
        zoomMeet?: typeof zoomMeetData;
        microsoftTeams?: typeof teamsMeetData;
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
      if (teamsMeetData) {
        assignmentUpdate.microsoftTeams = teamsMeetData;
      }

      // Collect updates for batching
      candidateUpdates.push({
        updateOne: {
          filter: { _id: candidateId },
          update: {
            $set: {
              assignment: assignmentUpdate,
              attachments: mergedAttachments,
              'tracking.updatedAt': new Date(dateTime),
            },
          },
        },
      });

      historyBulk.push({
        updateOne: {
          filter: { candidateId },
          update: { $push: { history: historyEntry } },
          upsert: true as const,
        },
      });

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
      type BulkWriteOps = Parameters<
        BulkUpdateContext['Candidate']['bulkWrite']
      >[0];
      await Candidate.bulkWrite(candidateUpdates as unknown as BulkWriteOps);
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
        { path: 'status', select: 'name' },
      ])
      .lean();

    const transformedCandidates = await transformCandidatesWithStatusNames(
      updatedList as ICandidate[],
    );
    toBroadcast.push(...transformedCandidates);
    let assignDuration: number | undefined;
    if (scheduleGoogleMeet && meetDuration) {
      assignDuration = meetDuration;
    } else if (scheduleZoomMeet && zoomMeetDuration) {
      assignDuration = zoomMeetDuration;
    } else if (scheduleTeamsMeet && teamsMeetDuration) {
      assignDuration = teamsMeetDuration;
    } else {
      assignDuration = undefined;
    }

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
              jobId: getJobIdString(c as ICandidate),
            })),
            scheduledTime: time ?? undefined,
            duration: assignDuration,
            meetingLink: firstMeetingLink ?? undefined,
            outlookCalendarLink: firstOutlookLink ?? undefined,
            interviewType: (toBroadcast[0] as ICandidate).status ?? 'Interview',
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
