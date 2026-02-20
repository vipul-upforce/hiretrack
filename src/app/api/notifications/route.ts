import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Notification } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

type NotificationQuery = {
  organizationId: string;
  recipientId: string;
  isRead?: boolean;
  type?: string;
  priority?: 'high' | 'medium' | 'low';
};

export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);

    if (!user || !user.id || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = user;
    const recipientId = user.id;

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    if (!Notification) {
      return NextResponse.json(
        { error: 'Notification Model not found' },
        { status: 404 },
      );
    }

    // Build query
    const query: NotificationQuery = {
      organizationId,
      recipientId,
    };

    if (isRead !== null && isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (type !== null && type !== undefined) {
      query.type = type;
    }

    if (priority !== null && priority !== undefined) {
      const validPriority = priority as 'high' | 'medium' | 'low';
      if (['high', 'medium', 'low'].includes(validPriority)) {
        query.priority = validPriority;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const [notifications, totalCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    // Ensure createdAt is always returned; use most correct fallback when missing
    const getCreatedAtFallback = (notification: (typeof notifications)[0]): Date => {
      if (notification.updatedAt && !Number.isNaN(new Date(notification.updatedAt).getTime())) {
        return new Date(notification.updatedAt);
      }
      const id = notification._id;
      if (
        typeof id === 'object' &&
        id !== null &&
        'getTimestamp' in id &&
        typeof (id as { getTimestamp: () => Date }).getTimestamp === 'function'
      ) {
        return (id as { getTimestamp: () => Date }).getTimestamp();
      }
      return new Date();
    };

    const sanitizedNotifications = notifications.map((notification) => {
      if (notification.createdAt && !Number.isNaN(new Date(notification.createdAt).getTime())) {
        return notification;
      }
      logger.warn(
        { notificationId: notification._id },
        'Notification missing createdAt; using fallback',
      );
      return { ...notification, createdAt: getCreatedAtFallback(notification) };
    });

    return NextResponse.json({
      notifications: sanitizedNotifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error: unknown) {
    logger.error(
      { error, url: request.url },
      'Error in fetching notifications',
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
