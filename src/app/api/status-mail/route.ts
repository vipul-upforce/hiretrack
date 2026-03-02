import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import connectToDatabase, { User } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import {
  scheduleEmail,
  getEmailQueue,
  updateQueueItemHistoryIds,
} from './statusEmailQueue';
import { createPendingEmailHistory } from './statusEmailHistory';
import { sendQueuedEmail } from './statusEmailSender';
import type {
  StatusUpdateEmailRequest,
  StatusUpdateQueueData,
  QueueStatusResponse,
} from './types';

/**
 * POST handler for status update emails
 */
export async function POST(req: NextRequest) {
  try {
    const [userData, body] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
      connectToDatabase(),
    ]);
    const {
      jobName,
      jobId,
      eventTitle,
      candidateName,
      status,
      remark,
      rating,
      immediate = false,
      id,
      prev_status: prevStatus,
      endTime,
      startTime,
    } = body as StatusUpdateEmailRequest;

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = userData;

    if (!eventTitle) {
      return NextResponse.json(
        { error: 'Event title is required.' },
        { status: 400 },
      );
    }

    if (!User) {
      throw new Error('User model not defined. Database may not be connected.');
    }

    const users = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ['hr', 'admin'] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select('email name role')
      .lean();

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'No active users found for this organization.' },
        { status: 404 },
      );
    }

    let hrContactInfo = '';
    if (userData?.role === 'hr') {
      hrContactInfo = `${userData?.email} ${userData?.name}`;
    } else {
      const hrUser = users.find((user) => user.role === 'hr');
      hrContactInfo = hrUser ? `${hrUser.email} ${hrUser.name}` : '';
    }

    const actionBy = userData?.name;
    const emailList = users.map((user) => user.email);
    const eventSubTitle =
      prevStatus && prevStatus !== ''
        ? `Status updated from <strong>${prevStatus}</strong> to <strong>${status}</strong> for candidate: <strong>${candidateName}</strong><br>`
        : `Status updated to <strong>${status}</strong> for candidate: <strong>${candidateName}</strong><br>`;

    const emailKey = id;
    const origin = req.headers.get('Origin') || '';
    // Status update email is sent to admin/hr only → use job page link
    const candidateDetails =
      jobId && origin
        ? `${origin}/dashboard/jobs/${jobId}?candidateId=${id}`
        : `${origin}/candidate/${id}`;

    // Queue data for the email
    const queueData: StatusUpdateQueueData = {
      organizationId,
      eventTitle,
      eventSubTitle,
      candidateName,
      status,
      remark,
      rating,
      jobName,
      emailList,
      actionBy,
      prevStatus,
      candidateDetails,
      candidateId: id,
      jobId,
      sentBy: userData?.id,
      sentByEmail: userData?.email,
      sentByName: userData?.name,
      startTime,
      endTime,
      hrContactInfo,
    };

    if (immediate) {
      const emailStatus = await sendQueuedEmail(queueData);

      if (emailStatus.status === 200) {
        return NextResponse.json({ message: 'Email sent successfully.' });
      }
      return NextResponse.json(
        { error: emailStatus.message },
        { status: emailStatus.status },
      );
    }

    // Create pending email history entries BEFORE scheduling
    const historyIds = await createPendingEmailHistory(queueData, organizationId);

    // Schedule the email
    scheduleEmail(emailKey, queueData);

    // Update the queue item with history IDs
    updateQueueItemHistoryIds(emailKey, historyIds);

    return NextResponse.json({
      message:
        'Email scheduled successfully. It will be sent in 2 minutes with the most updated information.',
      pendingHistoryRecords: historyIds.length,
    });
  } catch (error: unknown) {
    logger.error({ error, url: req.url }, 'ERROR in status-mail POST: ');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown Error Occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler for queue status (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return queue status (only for admin users)
    const emailQueue = getEmailQueue();
    const queueStatus: QueueStatusResponse = {
      queueSize: emailQueue.size,
      queue: Array.from(emailQueue.entries()).map(([key, value]) => ({
        key,
        candidateName: value.data.candidateName,
        status: value.data.status,
        remark: value.data.remark,
        rating: value.data.rating,
        scheduledAt: new Date(value.timestamp).toISOString(),
        timeRemaining: `${Math.round((value.timestamp - Date.now()) / 1000)} seconds`,
        pendingHistoryRecords: value.historyIds.length,
      })),
    };

    return NextResponse.json(queueStatus);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown Error Occurred',
      },
      { status: 500 },
    );
  }
}
