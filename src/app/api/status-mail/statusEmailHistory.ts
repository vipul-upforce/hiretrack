import mongoose from 'mongoose';
import { User, EmailHistory } from '@/lib/mongodb';
import { getMappedEmailTemplate } from '@/app/actions/getMappedEmailTemplate';
import { logger } from '@/lib/logger/logger.server';
import { getMailProvider } from '@/lib/utils/mailSettings';
import type { StatusUpdateQueueData } from './types';

/**
 * Create pending email history entries for status updates
 */
export async function createPendingEmailHistory(
  data: StatusUpdateQueueData,
  organizationId: string,
): Promise<string[]> {
  const {
    emailList,
    candidateName,
    status,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
    eventTitle,
    jobName,
    remark,
    rating,
    actionBy,
    prevStatus,
    eventSubTitle,
    candidateDetails,
    hrContactInfo,
  } = data;

  const provider = await getMailProvider(organizationId);
  const historyIds: string[] = [];

  try {
    // Get email content for history (using placeholder values that will be updated)
    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      'status-update',
      {
        eventTitle,
        jobTitle: jobName,
        candidateName,
        newStatus: status,
        statusMessage: remark,
        rating,
        actionBy,
        nextSteps: 'TBD', // Will be updated when actually sent
        prev_status: prevStatus,
        eventSubTitle,
        candidateDetails,
        organizationName: 'TBD', // Will be updated when actually sent
        hrContactInfo,
      },
      organizationId,
    );

    // Create history records for all recipients (HR/Admins) - PENDING
    const historyPromises = emailList.map(async (recipientEmail: string) => {
      try {
        const recipient = await User?.findOne({
          email: recipientEmail,
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select('_id name')
          .lean();

        const history = await EmailHistory?.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          sentBy: new mongoose.Types.ObjectId(sentBy || ''),
          sentByEmail: sentByEmail || '',
          sentByName: sentByName || '',
          recipientType: 'user',
          recipientId: recipient?._id || new mongoose.Types.ObjectId(),
          recipientEmail,
          recipientName: recipient?.name || recipientEmail,
          subject: emailSubject,
          body: emailContent,
          cc: [],
          bcc: [],
          replyTo: sentByEmail,
          attachments: [],
          status: 'pending', // Mark as pending
          sentAt: undefined, // Will be set when actually sent
          error: undefined,
          provider,
          metadata: {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
            templateUsed: 'status-update',
            eventType: 'status_change',
            scheduledFor: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
            previousStatus: prevStatus,
            newStatus: status,
          },
        });

        return history?._id.toString();
      } catch (historyError) {
        logger.error(
          { error: historyError },
          `Failed to create pending history for ${recipientEmail}:`,
        );
        return null;
      }
    });

    const resolvedHistoryIds = await Promise.all(historyPromises);
    historyIds.push(...resolvedHistoryIds.filter((id) => id !== null) as string[]);

    return historyIds;
  } catch (error) {
    logger.error({ error }, 'Failed to create pending email history');
    return [];
  }
}

// Re-export for backward compatibility
export { updateEmailHistoryStatus } from '@/lib/utils/emailHistory';
