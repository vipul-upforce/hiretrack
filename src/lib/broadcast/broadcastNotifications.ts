import { signToken } from '@/app/actions/auth';
import { INotification } from '@/lib/models/notification';

export async function broadcastNotification(
  orgId: string,
  recipientId: string,
  notification: INotification,
) {
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  const encoded = await signToken(notification, orgId);

  orgClients.forEach((client) => {
    if (client.userId !== recipientId) return;
    try {
      const data = `data: ${JSON.stringify({ type: 'notification', notification: encoded })}\n\n`;
      client.controller.enqueue(encoder.encode(data));
    } catch (error) {
      console.error(
        `Failed to send notification to client ${client.id}:`,
        error,
      );
    }
  });
}

export async function broadcastNotifications(
  orgId: string,
  notifications: INotification[],
) {
  if (!notifications.length) return;
  const encoder = new TextEncoder();
  const recipients = new Map<string, INotification[]>();
  notifications.forEach((n) => {
    const list = recipients.get(n.recipientId) || [];
    list.push(n);
    recipients.set(n.recipientId, list);
  });

  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  for (const [recipientId, items] of recipients.entries()) {
    const encoded = await signToken(items, orgId);
    orgClients.forEach((client) => {
      if (client.userId !== recipientId) return;
      try {
        const data = `data: ${JSON.stringify({ type: 'notifications', notifications: encoded })}\n\n`;
        client.controller.enqueue(encoder.encode(data));
      } catch (error) {
        console.error(
          `Failed to send notifications to client ${client.id}:`,
          error,
        );
      }
    });
  }
}

export function broadcastNotificationCount(
  orgId: string,
  recipientId: string,
  count: number,
) {
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  const payload = `data: ${JSON.stringify({ type: 'notificationCountUpdated', count })}\n\n`;
  orgClients.forEach((client) => {
    if (client.userId !== recipientId) return;
    try {
      client.controller.enqueue(encoder.encode(payload));
    } catch (error) {
      console.error(`Failed to send count to client ${client.id}:`, error);
    }
  });
}
