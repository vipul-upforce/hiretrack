import type { WebSocket } from 'ws';
import { signAccessToken } from '@/app/actions/auth';
import { INotification } from '@/lib/models/notification';
import logger from '../logger';

/**
 * WebSocket client interface for real-time broadcasting
 */
interface WSClient {
  id: number;
  orgId: string;
  userId: string;
  socket: WebSocket;
  controller?: {
    enqueue: (data: Uint8Array) => void;
    desiredSize: number | null;
  };
}

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var wsClients: Map<string, Map<number, WSClient>>;
  // eslint-disable-next-line no-var, vars-on-top
  var sseNotificationClients: Map<string, Map<number, WSClient>>;
}

/**
 * Send data to a WebSocket client with error handling
 */
function sendToClient(client: WSClient, data: object): boolean {
  try {
    if (client.socket && client.socket.readyState === 1) {
      client.socket.send(JSON.stringify(data));
      return true;
    }
    if (client.controller && client.controller.desiredSize !== null) {
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      return true;
    }
  } catch {
    // Connection is dead
  }
  return false;
}

export async function broadcastNotification(
  orgId: string,
  recipientId: string,
  notification: INotification,
) {
  const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoded = await signAccessToken(notification, orgId);

  orgClients.forEach((client) => {
    if (client.userId !== recipientId) return;
    const sent = sendToClient(client, { type: 'notification', notification: encoded });
    if (!sent) {
      logger.error(`Failed to send notification to client ${client.id}`);
    }
  });
}

export async function broadcastNotifications(
  orgId: string,
  notifications: INotification[],
) {
  if (!notifications.length) return;
  
  const recipients = new Map<string, INotification[]>();
  notifications.forEach((n) => {
    const list = recipients.get(n.recipientId) || [];
    list.push(n);
    recipients.set(n.recipientId, list);
  });

  const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  for (const [recipientId, items] of recipients.entries()) {
    const encoded = await signAccessToken(items, orgId);
    orgClients.forEach((client) => {
      if (client.userId !== recipientId) return;
      const sent = sendToClient(client, { type: 'notifications', notifications: encoded });
      if (!sent) {
        logger.error(`Failed to send notifications to client ${client.id}`);
      }
    });
  }
}

export function broadcastNotificationCount(
  orgId: string,
  recipientId: string,
  count: number,
) {
  const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  orgClients.forEach((client) => {
    if (client.userId !== recipientId) return;
    const sent = sendToClient(client, { type: 'notificationCountUpdated', count });
    if (!sent) {
      logger.error(`Failed to send count to client ${client.id}`);
    }
  });
}
