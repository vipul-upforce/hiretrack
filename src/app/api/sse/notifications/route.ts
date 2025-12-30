import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Notification } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export const runtime = 'nodejs';

interface NotificationSSEClient {
  id: number;
  orgId: string;
  userId: string;
  sessionSignature: string;
  controller: ReadableStreamDefaultController;
}

const globalStore = global as unknown as {
  sseNotificationClients: Map<string, Map<number, NotificationSSEClient>>;
};

if (!globalStore.sseNotificationClients) {
  globalStore.sseNotificationClients = new Map<
    string,
    Map<number, NotificationSSEClient>
  >();
}

// Helper to count active connections for a specific user AND their specific browser session
const getUserConnectionCount = (
  orgClients: Map<number, NotificationSSEClient>,
  userId: string,
  sessionSignature: string,
) => {
  let count = 0;
  for (const client of orgClients.values()) {
    if (
      client.userId === userId &&
      client.sessionSignature === sessionSignature
    ) {
      count += 1;
    }
  }
  return count;
};

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
            `data: ${JSON.stringify({
              type: 'auth_error',
              error: 'Unauthorized',
            })}\n\n`,
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

  // Generate a unique signature for this browser session based on cookies.
  const sessionSignature = req.headers.get('cookie') || 'unknown-session';

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  // Ensure the Org Map exists in our typed store
  if (!globalStore.sseNotificationClients.has(orgId)) {
    globalStore.sseNotificationClients.set(
      orgId,
      new Map<number, NotificationSSEClient>(),
    );
  }

  const orgClients = globalStore.sseNotificationClients.get(orgId)!;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const clientId = Date.now() + Math.floor(Math.random() * 1000);

      const newClient: NotificationSSEClient = {
        id: clientId,
        orgId,
        userId,
        sessionSignature,
        controller,
      };

      // Register Client
      orgClients.set(clientId, newClient);

      // Helper to broadcast count
      const broadcastTabCount = () => {
        // orgClients matches the signature of getUserConnectionCount exactly now
        const currentCount = getUserConnectionCount(
          orgClients,
          userId,
          sessionSignature,
        );

        const message = encoder.encode(
          `data: ${JSON.stringify({
            type: 'connectionStatus',
            activeTabs: currentCount,
          })}\n\n`,
        );

        for (const client of orgClients.values()) {
          // client matches NotificationSSEClient, so sessionSignature exists
          if (
            client.userId === userId &&
            client.sessionSignature === sessionSignature
          ) {
            try {
              client.controller.enqueue(message);
            } catch {
              // Ignore errors for closed streams
            }
          }
        }
      };

      // Send initial state
      const initialCount = getUserConnectionCount(
        orgClients,
        userId,
        sessionSignature,
      );
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'connected',
            orgId,
            userId,
            activeTabs: initialCount,
          })}\n\n`,
        ),
      );

      // Broadcast to other tabs in THIS browser
      setTimeout(() => {
        if (orgClients.has(clientId)) {
          broadcastTabCount();
        }
      }, 500);

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
                `data: ${JSON.stringify({
                  type: 'notificationCountUpdated',
                  count: unread,
                })}\n\n`,
              ),
            );
          }
        } catch {
          // fail quietly
        }
      })();

      const heartbeat = setInterval(() => {
        const currentClientsCount = orgClients.size;
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'clients',
                clients: currentClientsCount,
                orgId,
              })}\n\n`,
            ),
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.signal.addEventListener('abort', () => {
        orgClients.delete(clientId);
        if (orgClients.size === 0) {
          globalStore.sseNotificationClients.delete(orgId);
        } else {
          broadcastTabCount();
        }
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ignore
        }
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
