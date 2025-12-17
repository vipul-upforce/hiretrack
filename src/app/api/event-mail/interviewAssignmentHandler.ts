import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Settings, User } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { resolveSentByToObjectId } from '@/lib/utils/userResolution';
import { createPendingEmailHistory } from './emailHistory';
import {
  scheduleEmail,
  getEmailQueueItem,
  updateEmailQueueItem,
} from './emailQueue';
import { sendQueuedEmail } from './emailSender';
import { InterviewAssignmentRequest, EventMailQueueData } from './types';

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get from email from settings
 */
function getFromEmail(settings: { mailConfig?: { resend_from?: string; brevo_from?: string; smtp_from?: string } } | null): string {
  if (!settings?.mailConfig) {
    return 'system@hiretrack.com';
  }
  return (
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    'system@hiretrack.com'
  );
}

/**
 * Handle interview assignment email request
 */
export async function handleInterviewAssignment(req: NextRequest) {
  const data = (await req.json()) as InterviewAssignmentRequest;
  const {
    email,
    eventTitle,
    startTime,
    endTime,
    jobId,
    jobName,
    interviewerName,
    candidateName,
    status,
    immediate = false,
    id,
  } = data;

  const candidateDetailsPage = `${req.headers.get('origin')}/candidate/${id}`;
  const dashboardLink = `${req.headers.get('origin')}/dashboard`;

  const userData = await getAuthenticatedUser(req);
  if (!userData) {
    return NextResponse.json(
      { message: 'Unauthorised Access' },
      { status: 401 },
    );
  }
  const { organizationId } = userData;
  const senderEmail = userData.email;

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization ID is missing.' },
      { status: 400 },
    );
  }

  if (!email || !eventTitle) {
    return NextResponse.json(
      { error: 'Email, event title, start time, and end time are required.' },
      { status: 400 },
    );
  }

  if (!validateEmail(email)) {
    return NextResponse.json(
      { error: 'Invalid email format.' },
      { status: 400 },
    );
  }

  if (!User || !Settings) {
    throw new Error('Database not connected');
  }

  // Optimize: Fetch users and settings in parallel
  const [hrUsers, settings] = await Promise.all([
    User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ['hr', 'admin'] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select('email')
      .lean()
      .exec(),
    Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select(
        'mailConfig.resend_from mailConfig.brevo_from mailConfig.smtp_from',
      )
      .lean()
      .exec(),
  ]);

  if (!settings || !settings.mailConfig) {
    return NextResponse.json(
      { error: 'Mail configuration not found' },
      { status: 500 },
    );
  }

  const fromEmail = getFromEmail(settings);
  const emailList = hrUsers.map((user) => user.email);
  const emailKey = id;

  // Resolve sentBy to valid ObjectId before queuing
  const resolvedSentById = await resolveSentByToObjectId({
    sentBy: userData?.id || 'system',
    sentByEmail: userData?.email || fromEmail,
    sentByName: userData?.name || 'HireTrack System',
    organizationId,
    fromEmail,
  });

  // Queue data for the email (use resolved ObjectId)
  const queueData: EventMailQueueData = {
    organizationId,
    email,
    eventTitle,
    startTime,
    endTime,
    jobName,
    interviewerName,
    candidateName,
    status,
    emailList,
    candidateDetailsPage,
    sentBy: resolvedSentById, // Use resolved ObjectId (string)
    sentByEmail: userData?.email || fromEmail,
    sentByName: userData?.name || 'HireTrack System',
    candidateId: id,
    jobId,
    dashboardLink,
  };

  if (immediate) {
    const emailStatus = await sendQueuedEmail({
      data: queueData,
      req,
    });

    if (emailStatus.status === 200) {
      return NextResponse.json({ message: 'Email sent successfully.' });
    }
    return NextResponse.json(
      { error: emailStatus.message },
      { status: emailStatus.status },
    );
  }

  // Create pending email history entries BEFORE scheduling
  const historyIds = await createPendingEmailHistory({
    data: queueData,
    organizationId,
  });

  // Schedule the email
  scheduleEmail(emailKey, queueData, req, senderEmail);

  // Update the queue item with history IDs
  const queueItem = getEmailQueueItem(emailKey);
  if (queueItem) {
    queueItem.historyIds = historyIds;
    updateEmailQueueItem(emailKey, queueItem);
  }

  return NextResponse.json({
    message:
      'Email scheduled successfully. It will be sent in 2 minutes with the most updated information.',
    pendingHistoryRecords: historyIds.length,
  });
}
