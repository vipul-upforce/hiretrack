
import mongoose from 'mongoose';
import { User, EmailHistory } from '@/lib/mongodb';
import { getMappedEmailTemplate } from '@/app/actions/getMappedEmailTemplate';
import { getFromEmailAndProvider } from '@/lib/utils/mailSettings';
import { resolveSentByToObjectId } from '@/lib/utils/userResolution';
import {
  CreatePendingHistoryParams,
} from './types';


/**
 * Create pending email history entries
 */
export async function createPendingEmailHistory(
  params: CreatePendingHistoryParams,
): Promise<string[]> {
  const { data, organizationId } = params;
  const {
    email,
    emailList,
    interviewerName,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
  } = data;

  // Optimize: Get fromEmail and provider in a single query
  const { fromEmail, provider } = await getFromEmailAndProvider(organizationId);

  // Resolve sentBy after we have fromEmail
  const resolvedSentById = await resolveSentByToObjectId({
    sentBy,
    sentByEmail,
    sentByName,
    organizationId,
    fromEmail,
  });

  const historyIds: string[] = [];

  try {
    // Get email content for history
    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      'interview-assignment',
      {
        eventTitle: data.eventTitle,
        interviewDate: 'TBD', // Will be updated when actually sent
        endDate: 'TBD',
        jobTitle: data.jobName,
        interviewerName: data.interviewerName,
        candidateName: data.candidateName,
        interviewType: data.status,
        meetingLink: 'TBD',
        outlookCalendarLink: 'TBD',
        candidateProfileLink: data.candidateDetailsPage,
        organizationName: 'TBD',
      },
      organizationId,
    );

    // Create history record for interviewer (primary recipient) - PENDING
    const interviewerHistory = await EmailHistory?.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      sentBy: new mongoose.Types.ObjectId(resolvedSentById),
      sentByEmail,
      sentByName,
      recipientType: 'user',
      recipientId: new mongoose.Types.ObjectId(), // Would need interviewer ID if available
      recipientEmail: email,
      recipientName: interviewerName,
      subject: emailSubject,
      body: emailContent,
      cc: [],
      bcc: emailList,
      replyTo: sentByEmail,
      attachments: [],
      status: 'pending', // Mark as pending
      sentAt: undefined, // Will be set when actually sent
      error: undefined,
      provider,
      metadata: {
        candidateId: new mongoose.Types.ObjectId(candidateId),
        jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
        templateUsed: 'interview-assignment',
        eventType: 'interview_assignment',
        scheduledFor: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      },
    });

    if (interviewerHistory?._id) {
      historyIds.push(interviewerHistory._id.toString());
    }

    // Optimize: Batch fetch all HR users in a single query instead of individual lookups
    const hrUsers =
      emailList.length > 0
        ? await User?.find({
            email: { $in: emailList },
            organizationId: new mongoose.Types.ObjectId(organizationId),
          })
            .select('_id name email')
            .lean()
            .exec()
        : [];

    // Create a map for fast lookup
    const hrUserMap = new Map(
      hrUsers?.map((user) => [user.email, user]) || [],
    );

    // Create history records for BCC recipients (HR/Admins) - PENDING (batched)
    const hrHistoryPromises = emailList.map(async (hrEmail: string) => {
      try {
        const hrUser = hrUserMap.get(hrEmail);
        const hrHistory = await EmailHistory?.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          sentBy: new mongoose.Types.ObjectId(resolvedSentById),
          sentByEmail,
          sentByName,
          recipientType: 'user',
          recipientId: hrUser?._id || new mongoose.Types.ObjectId(),
          recipientEmail: hrEmail,
          recipientName: hrUser?.name || hrEmail,
          subject: emailSubject,
          body: emailContent,
          cc: [],
          bcc: [],
          replyTo: sentByEmail,
          attachments: [],
          status: 'pending',
          sentAt: undefined,
          error: undefined,
          provider,
          metadata: {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
            templateUsed: 'interview-assignment',
            eventType: 'interview_assignment',
            scheduledFor: new Date(Date.now() + 2 * 60 * 1000),
          },
        });

        return hrHistory?._id?.toString() || null;
      } catch {
        return null;
      }
    });

    const hrHistoryIds = await Promise.all(hrHistoryPromises);
    historyIds.push(...hrHistoryIds.filter((id): id is string => id !== null));

    return historyIds;
  } catch {
    return [];
  }
}

// Re-export for backward compatibility
export { updateEmailHistoryStatus } from '@/lib/utils/emailHistory';
