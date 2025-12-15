import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Notification } from '@/lib/mongodb';
import { broadcastNotificationCount } from '@/lib/broadcast/broadcastNotifications';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function PUT(request: NextRequest) {
  try {
    // Check authentication

    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    if (!Notification) {
      return NextResponse.json(
        { error: 'Notification Model not found' },
        { status: 404 },
      );
    }

    // Mark all unread notifications as read for this user
    const [result] = await Promise.all([
      Notification.updateMany(
        {
          organizationId: user?.organizationId,
          recipientId: user?.id,
          isRead: false,
        },
        {
          isRead: true,
          updatedAt: new Date(),
        },
      ),
      broadcastNotificationCount(user?.organizationId!, user?.id!, 0),
    ]);

    return NextResponse.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error: unknown) {
    logger.error(
      { error, url: request.url },
      'Error in marking all notifications as read',
    );
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 },
    );
  }
}
