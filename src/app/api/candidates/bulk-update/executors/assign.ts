import { Schema } from 'mongoose';
import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import type { BulkAssignParams, BulkUpdateContext, BulkUpdateResult } from '../types';
import { getJobIdString } from '../utils';
import { logger } from '@/lib/logger/logger.server';
import { handleFileAttachments, Attachments } from '@/lib/fileUtils';
import connectToDatabase, { Settings } from '@/lib/mongodb';

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
  } = params;
  const { user, dateTime, Candidate, History, User } = ctx;
  const toBroadcast: ICandidate[] = [];
  let failedCount = 0;

  const interviewer = await User.findById(interviewerId).select('_id name email').lean();
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
  let processedAttachments: Array<{ id: string; name: string; url: string; type: string; size: number }> = [];
  if (attachments.length > 0 && user.organizationId) {
    try {
      await connectToDatabase();
      const settings = await Settings?.findOne({ organizationId: user.organizationId })
        .select('fileStorage')
        .lean();
      const fileStorage = settings?.fileStorage?.storageType || 'local';

      const images = attachments.filter((att) => att.type.startsWith('image'));
      const files = attachments.filter((att) => !att.type.startsWith('image'));

      const attachmentsObj: Attachments = { files, images };
      const { files: processedFiles, images: processedImages } = await handleFileAttachments(
        attachmentsObj,
        fileStorage,
        user.organizationId,
      );
      processedAttachments = [...processedFiles, ...processedImages];
    } catch (err) {
      logger.error({ error: err }, 'Bulk assign: failed to process attachments');
    }
  }

  for (const candidate of candidates) {
    try {
      const candidateId = (candidate._id as { toString: () => string }).toString();
      const jobId = getJobIdString(candidate);
      const candidateObj = candidate as ICandidate;
      let previousInterviewerId: unknown = null;
      if (candidate.assignment?.interviewerId != null) {
        const a = candidate.assignment.interviewerId as { _id?: unknown };
        previousInterviewerId =
          typeof a === 'object' && a !== null && '_id' in a ? a._id : candidate.assignment.interviewerId;
      }

      // Merge attachments with existing candidate attachments
      const existingAttachments = candidateObj.attachments || [];
      const existingNames = new Set(existingAttachments.map((a) => a.name));
      const newAttachments = processedAttachments.filter((a) => !existingNames.has(a.name));
      const mergedAttachments = [...existingAttachments, ...newAttachments];

      // Schedule Google Calendar meeting if requested
      let googleMeetData: {
        eventId: string;
        meetingLink: string;
        htmlLink: string;
        summary: string;
        description: string;
        meetingNotes?: string;
        meetingAttachments?: typeof meetingAttachments;
      } | null = null;

      if (scheduleGoogleMeet && time && user.organizationId) {
        try {
          const guests = [
            ...((interviewer as { email?: string }).email ? [(interviewer as { email: string }).email] : []),
            ...(candidateObj.email ? [candidateObj.email] : []),
            ...(user.email && user.email !== (interviewer as { email?: string }).email ? [user.email] : []),
            ...additionalGuests,
          ];

          // Process meeting attachments (convert File objects to base64 if needed)
          const processedMeetingAttachments = await Promise.all(
            meetingAttachments.map(async (att) => {
              if (att.url && !att.url.startsWith('data:') && !att.url.startsWith('http')) {
                // If it's a File object, we'd need to read it, but in API context it should already be base64
                return att;
              }
              return att;
            }),
          );

          // Call Google Calendar scheduling API with proper auth headers
          const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          // Copy auth headers from original request if available
          if (ctx.requestHeaders) {
            const authHeader = ctx.requestHeaders.get('authorization') || ctx.requestHeaders.get('cookie');
            if (authHeader) {
              if (ctx.requestHeaders.get('authorization')) {
                headers['authorization'] = ctx.requestHeaders.get('authorization')!;
              }
              if (ctx.requestHeaders.get('cookie')) {
                headers['cookie'] = ctx.requestHeaders.get('cookie')!;
              }
            }
          }

          const scheduleResponse = await fetch(`${baseUrl}/api/google-calendar/schedule-meet`, {
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
              jobTitle: (candidateObj.jobId as { title?: string })?.title || 'Position',
              organizationName: user.organizationInfo?.name || user.organizationId || 'Company',
              meetingNotes,
              meetingAttachments: processedMeetingAttachments,
            }),
          });

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
          logger.error({ error: err, candidateId }, 'Bulk assign: Google Meet scheduling error');
        }
      }

      const historyEntry: ICandidateHistory = {
        dateTime,
        title: `Assigned to ${(interviewer as { name: string }).name} : Assigned by ${user.name}`,
        currentInterviewer: interviewerId as unknown as Schema.Types.ObjectId,
        previousInterviewer: previousInterviewerId as Schema.Types.ObjectId | null,
        assignmentBy: user.id ?? null,
        note: { description: '', date: '', rating: 0, userId: null },
        attachments: processedAttachments,
      };

      const assignmentUpdate: {
        interviewerId: string;
        time: string | null;
        assignedAt: string;
        googleMeet?: typeof googleMeetData;
      } = {
        interviewerId,
        time: time ?? null,
        assignedAt: dateTime,
      };

      if (googleMeetData) {
        assignmentUpdate.googleMeet = googleMeetData;
      }

      await Candidate.updateOne(
        { _id: candidateId },
        {
          $set: {
            assignment: assignmentUpdate,
            attachments: mergedAttachments,
          },
        },
      );

      if (jobId) {
        await History.findOneAndUpdate(
          { candidateId, jobId },
          { $push: { history: historyEntry } },
          { upsert: true },
        );
      }

      const updated = await Candidate.findById(candidateId)
        .populate([
          { path: 'assignment.interviewerId', select: '_id name email' },
          { path: 'jobId', select: 'title description' },
        ])
        .lean();
      if (updated) toBroadcast.push(updated as ICandidate);
    } catch (err) {
      logger.error(
        { error: err, candidateId: (candidate as { _id: unknown })._id },
        'Bulk assign: failed one candidate',
      );
      failedCount += 1;
    }
  }

  return {
    success: true,
    updatedCount: toBroadcast.length,
    failedCount,
    candidatesToBroadcast: toBroadcast,
    message: `Assigned ${toBroadcast.length} candidate(s)`,
  };
}
