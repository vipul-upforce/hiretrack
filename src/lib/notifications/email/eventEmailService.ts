import mongoose from 'mongoose';
import connectToDatabase, {
  User,
  Candidate,
  CandidateAccount,
} from '@/lib/mongodb';
import { sendMail as sendMailWithContext } from './emailService';
import {
  validateObjectId,
  getMailConfig,
  getProvider,
  createEmailHistory,
  updateEmailHistoryStatus,
  filterRecipientsByNotificationSettings,
} from './helpers';

/**
 * Send event emails (status updates, remarks, etc.) with history tracking
 */
export async function sendEventEmailWithHistory(
  organizationId: string,
  emails: string[],
  subject: string,
  html: string,
  context: {
    sentBy: string;
    sentByEmail: string;
    sentByName: string;
    metadata?: {
      jobId?: string;
      candidateId?: string;
      templateUsed?: string;
      eventType?: string;
    };
  },
  triggererEmail?: string,
  isCandidate: boolean = false,
): Promise<{ status: number; message: string }> {
  console.log(emails, 'emails-34');
  try {
    const mailConfig = await getMailConfig(organizationId);
    if (!mailConfig) {
      return {
        status: 500,
        message: 'Mail configuration not found for the organization.',
      };
    }

    const isAuthEmail = ['2fa_authentication', 'password_reset'].includes(
      context.metadata?.eventType || '',
    );
    const filteredEmails = isAuthEmail
      ? emails
      : emails.filter(
          (email) => email && email !== (context.sentByEmail || triggererEmail),
        );

    if (filteredEmails.length === 0) {
      return { status: 404, message: 'No valid recipients found.' };
    }

    await connectToDatabase();
    const candidateRecipient =
      filteredEmails[0] && context.metadata?.eventType === 'job_application'
        ? await Candidate?.findOne({
            email: filteredEmails[0],
            organizationId: new mongoose.Types.ObjectId(organizationId),
          })
            .select('_id name email')
            .lean()
        : null;
    console.log(candidateRecipient, 'candidateRecipient-72');
    console.log(isCandidate, 'isCandidate-73');
    const recipients = isCandidate
      ? await CandidateAccount?.find({
          email: filteredEmails[0],
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select('_id name email')
          .lean()
      : await User?.find({
          email: filteredEmails[0],
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select('_id name email')
          .lean();
    console.log(recipients, 'recipients-74');
    const filteredRecipients = isAuthEmail
      ? recipients || []
      : await filterRecipientsByNotificationSettings(
          recipients || [],
          organizationId,
          context.metadata?.eventType,
          context.metadata?.jobId,
          context.sentBy,
        );
    console.log(filteredRecipients, 'filteredRecipients-84');
    const allRecipients = candidateRecipient
      ? [candidateRecipient, ...filteredRecipients]
      : filteredRecipients;
    console.log(allRecipients, 'allRecipients-88');
    if (allRecipients.length === 0) {
      return {
        status: 404,
        message: 'No valid recipients found after filtering.',
      };
    }

    const primaryRecipient = allRecipients[0];
    const bccRecipients = allRecipients
      .slice(1)
      .map((r) => r.email || '')
      .filter(Boolean);
    const jobId = validateObjectId(context.metadata?.jobId);
    const candidateId = validateObjectId(context.metadata?.candidateId);

    const emailHistory = await createEmailHistory({
      organizationId,
      sentBy: context.sentBy,
      sentByEmail: context.sentByEmail,
      sentByName: context.sentByName,
      recipientType:
        candidateRecipient &&
        primaryRecipient.email === candidateRecipient.email
          ? 'candidate'
          : 'user',
      recipientId: primaryRecipient._id?.toString(),
      recipientEmail: primaryRecipient.email || '',
      recipientName: primaryRecipient.name || primaryRecipient.email || '',
      subject,
      body: html,
      cc: [],
      bcc: bccRecipients,
      replyTo: context.sentByEmail,
      attachments: [],
      provider: getProvider(mailConfig),
      metadata: context.metadata
        ? {
            jobId: jobId?.toString(),
            candidateId: candidateId?.toString(),
            templateUsed: context.metadata.templateUsed,
            eventType: context.metadata.eventType,
          }
        : undefined,
    });

    if (!emailHistory) {
      return { status: 500, message: 'Failed to create email history' };
    }

    const result = await sendMailWithContext(
      mailConfig,
      primaryRecipient.email || '',
      subject,
      undefined,
      html,
      [],
      bccRecipients,
      context.sentByEmail,
      undefined,
      { emailHistoryId: emailHistory._id.toString() },
    );

    await updateEmailHistoryStatus(
      emailHistory._id,
      result.success,
      result.messageId,
      result.error,
    );

    return result.success
      ? { status: 200, message: 'All event emails sent successfully.' }
      : {
          status: 500,
          message: `Failed to send email. Error: ${result.error}`,
        };
  } catch (error) {
    return {
      status: 500,
      message:
        error instanceof Error ? error.message : 'Failed to send event emails',
    };
  }
}
