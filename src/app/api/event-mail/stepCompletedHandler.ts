import { NextRequest, NextResponse } from 'next/server';
import { sendSmartNotification } from '@/lib/notifications/email/unifiedEmailService';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Settings, User } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';
import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
import { getCandidateDetailsPageUrl } from '@/lib/notifications/email/smartNotificationService';
import { NotificationType } from '@/lib/notifications/decision';
import { getNextStep } from '@/lib/utils/organization';
import { resolveSentByToObjectId } from '@/lib/utils/userResolution';
import { StepCompletedRequest } from './types';

/**
 * Get from email from settings
 */
function getFromEmail(
  settings: {
    mailConfig?: {
      resend_from?: string;
      brevo_from?: string;
      smtp_from?: string;
    };
  } | null,
): string {
  if (!settings?.mailConfig) {
    return '';
  }
  return (
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    ''
  );
}

/**
 * Handle step completed email request
 */
export async function handleStepCompleted(req: NextRequest) {
  // Optimize: Authenticate and parse request in parallel
  const [user, data] = await Promise.all([
    getAuthenticatedUser(req),
    req.json() as Promise<StepCompletedRequest>,
  ]);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { organizationId } = user;
  const latestRemark = data.feedback;
  const newDate = data.dateTime;

  // Optimize: Fetch all required data in parallel (recipientUser for role-based link when recipientEmail provided)
  const [completionDate, organization, settings, hrUsers, recipientUser] =
    await Promise.all([
      getFormattedDate(req, newDate, false, organizationId).then(
        (date) => date as string,
      ),
      User?.findOne({
        organizationId,
      })
        .select('organizationId')
        .populate({
          path: 'organizationId',
          select: 'name',
        })
        .lean(),
      Settings?.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select(
          'mailConfig.resend_from mailConfig.brevo_from mailConfig.smtp_from',
        )
        .lean()
        .exec(),
      User?.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        role: { $in: ['hr', 'admin'] },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      })
        .select('email')
        .lean()
        .exec(),
      data.previousInterviewerEmail
        ? User?.findOne({
            organizationId: new mongoose.Types.ObjectId(organizationId),
            email: data.previousInterviewerEmail,
          })
            .select('role')
            .lean()
            .exec()
        : Promise.resolve(null),
    ]);

  if (!settings || !settings.mailConfig) {
    return NextResponse.json(
      { error: 'Mail configuration not found' },
      { status: 500 },
    );
  }

  const fromEmail = getFromEmail(settings);
  const nextSteps = await getNextStep(
    data.jobId ?? null,
    data.status,
    organizationId,
  );
  const origin = req.headers.get('Origin') ?? '';
  const linkKind: 'dashboard' | 'candidate' =
    recipientUser?.role === 'interviewer' ? 'candidate' : 'dashboard';
  const candidateDetails = getCandidateDetailsPageUrl(
    origin,
    data.candidateId,
    data.jobId ?? null,
    linkKind,
  );

  // Resolve sentBy and fetch email template in parallel
  const [resolvedSentById, emailTemplate] = await Promise.all([
    resolveSentByToObjectId({
      sentBy: user.id || 'system',
      sentByEmail: user.email || fromEmail,
      sentByName: user.name || 'HireTrack System',
      organizationId,
      fromEmail,
    }),
    getMappedEmailTemplate(
      'step-completed',
      {
        candidateName: data.name || '',
        completedBy: user.name || '',
        candidateProfileLink: candidateDetails || 'N/A',
        jobTitle: data.title || '',
        organizationName:
          typeof organization?.organizationId === 'object'
            ? organization.organizationId.name || ''
            : user?.organizationInfo?.name || '',
        stepName: data?.status || '',
        feedback: latestRemark?.description || 'N/A',
        rating: latestRemark?.rating?.toString() || 'N/A',
        completionDate,
        recipientName: '',
        nextStep: nextSteps,
      },
      organizationId,
    ),
  ]);

  const { emailContent, emailSubject } = emailTemplate;
  const emailList = hrUsers?.map((hrUser) => hrUser.email) || [];
  const emailStatus = await sendSmartNotification(
    organizationId,
    NotificationType.STEP_COMPLETED,
    {
      triggererUserId: resolvedSentById,
      triggererEmail: user.email || fromEmail,
      triggererName: user.name || 'HireTrack System',
      candidateId: data.candidateId,
      jobId: data.jobId,
      templateUsed: 'step-completed',
      eventType: 'step_completed',
    },
    {
      subject: emailSubject,
      html: emailContent,
    },
    [...emailList, (data.previousInterviewerEmail ?? '') as string],
  );

  if (emailStatus.status === 200) {
    return NextResponse.json({ message: 'Email sent successfully.' });
  }
  return NextResponse.json(
    {
      error: emailStatus.message,
    },
    { status: emailStatus.status },
  );
}
