import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";

interface NotificationSSEClient {
  id: number;
  orgId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}

declare global {
  var sseNotificationClients: Map<string, Map<number, NotificationSSEClient>>;
}

global.sseNotificationClients =
  global.sseNotificationClients ||
  new Map<string, Map<number, NotificationSSEClient>>();

export async function GET(req: NextRequest) {
  const cookie = await auth(req);
  const user = cookie?.user;
  if (!user || !user.organizationId || !user.id) {
    return new NextResponse("Unauthorized or no organization specified", {
      status: 401,
    });
  }

  const orgId = user.organizationId;
  const userId = user.id;

  if (!global.sseNotificationClients.has(orgId)) {
    global.sseNotificationClients.set(
      orgId,
      new Map<number, NotificationSSEClient>()
    );
  }

  const orgClients = global.sseNotificationClients.get(orgId)!;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", orgId, userId })}\n\n`
        )
      );

      const clientsCount = orgClients.size;
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "clients", clients: clientsCount, orgId })}\n\n`
        )
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
                `data: ${JSON.stringify({ type: "notificationCountUpdated", count: unread })}\n\n`
              )
            );
          }
        } catch (e) {
          // fail quietly
        }
      })();

      const clientId = Date.now() + Math.floor(Math.random() * 1000);
      orgClients.set(clientId, { id: clientId, orgId, userId, controller });

      const heartbeat = setInterval(() => {
        const clientsCount = orgClients.size;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "clients", clients: clientsCount, orgId })}\n\n`
          )
        );
      }, 20000);

      req.signal.addEventListener("abort", () => {
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
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
