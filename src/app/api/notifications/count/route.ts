import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Notification } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, id: recipientId } = user;

    // Single aggregation query instead of 2 expensive count queries
    const [result] = await (Notification?.aggregate([
      {
        $match: { organizationId, recipientId },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: ['$isRead', 0, 1] },
          },
        },
      },
    ]) ?? []);

    return NextResponse.json({
      unreadCount: result?.unreadCount ?? 0,
      totalCount: result?.totalCount ?? 0,
    });
  } catch (err) {
    logger.error(
      { err, url: request.url },
      'Error in fetching notification counts',
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
