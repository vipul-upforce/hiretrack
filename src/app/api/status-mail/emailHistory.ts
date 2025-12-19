import mongoose from 'mongoose';
import { Settings, User, EmailHistory } from '@/lib/mongodb';
import { getMappedEmailTemplate } from '@/app/actions/getMappedEmailTemplate';
import { logger } from '@/lib/logger/logger.server';
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

  // Optimize: Fetch settings and template in parallel
  const [settings, { emailContent, emailSubject }] = await Promise.all([
    Settings?.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select('mailConfig')
      .lean()
      .exec(),
    getMappedEmailTemplate(
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
    ),
  ]);

  const provider = settings?.mailConfig?.mailProvider || 'unknown';
  const historyIds: string[] = [];

  try {
    // Optimize: Batch fetch all recipients in a single query (fixes N+1 problem)
    const recipients =
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
    const recipientMap = new Map(
      recipients?.map((user) => [user.email, user]) || [],
    );

    // Create history records for all recipients (HR/Admins) - PENDING (batched)
    const historyPromises = emailList.map(async (recipientEmail: string) => {
      try {
        const recipient = recipientMap.get(recipientEmail);

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
    historyIds.push(
      ...(resolvedHistoryIds.filter((id) => id !== null) as string[]),
    );

    return historyIds;
  } catch (error) {
    logger.error({ error }, 'Failed to create pending email history');
    return [];
  }
}
