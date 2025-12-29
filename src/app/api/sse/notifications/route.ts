import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Notification } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

interface NotificationSSEClient {
  id: number;
  orgId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}

// /* eslint-disable vars-on-top, no-var */
declare global {
  var sseNotificationClients: Map<string, Map<number, NotificationSSEClient>>;
}

global.sseNotificationClients =
  global.sseNotificationClients ||
  new Map<string, Map<number, NotificationSSEClient>>();

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    // For SSE, we need to send an error event before closing
    // Create a stream that sends an auth_error event and then closes
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'auth_error', error: 'Unauthorized' })}\n\n`,
          ),
        );
        // Close after sending error
        setTimeout(() => {
          try {
            if (
              typeof controller.desiredSize === 'number' &&
              controller.desiredSize !== null
            ) {
              controller.close();
            }
          } catch (error) {
            logger.error({ error }, 'SSE controller close error');
          }
        }, 100);
      },
    });

    return new NextResponse(stream, {
      status: 401,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
  const orgId = user.organizationId;
  const userId = user.id;

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }
  if (!global.sseNotificationClients.has(orgId)) {
    global.sseNotificationClients.set(
      orgId,
      new Map<number, NotificationSSEClient>(),
    );
  }

  const orgClients = global.sseNotificationClients.get(orgId)!;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'connected', orgId, userId })}\n\n`,
        ),
      );

      const clientsCount = orgClients.size;
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'clients', clients: clientsCount, orgId })}\n\n`,
        ),
      );

      // Send initial unread count
      (async () => {
        try {
          await connectToDatabase();
          if (Notification) {
            const unread = await Notification.countDocuments({
              organizationId: orgId,
              recipientId: userId,
              isRead: false,
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'notificationCountUpdated', count: unread })}\n\n`,
              ),
            );
          }
        } catch {
          // fail quietly
        }
      })();

      const clientId = Date.now() + Math.floor(Math.random() * 1000);
      orgClients.set(clientId, {
        id: clientId,
        orgId,
        userId,
        controller,
      });

      const heartbeat = setInterval(() => {
        const currentClientsCount = orgClients.size;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'clients', clients: currentClientsCount, orgId })}\n\n`,
          ),
        );
      }, 20000);

      req.signal.addEventListener('abort', () => {
        orgClients.delete(clientId);
        if (orgClients.size === 0) {
          global.sseNotificationClients.delete(orgId);
        }
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
