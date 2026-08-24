import type { WebSocket } from 'ws';
import { signAccessToken } from '@/app/actions/auth';
import { CustomFields } from '@/Custom_Fields/Types/CustomField';
import logger from '../logger';
import { isUsingHttpBridge, sendViaBridge } from './httpBridge';

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

/**
 * Broadcast custom fields updates to all WebSocket clients via notification stream
 * FIXED: Signs token ONCE before broadcasting to all clients (not N times)
 */
export async function broadcastCustomFieldsUpdate(
  orgId: string,
  customFields: CustomFields,
) {
  try {
    // Sign token ONCE, not N times (performance fix)
    const encodedData = await signAccessToken(customFields, orgId);

    // Use HTTP bridge in development (separate WS server)
    if (isUsingHttpBridge()) {
      await sendViaBridge({
        type: 'customFieldsUpdate',
        orgId,
        data: { customFields: encodedData },
      });
      return;
    }

    // Direct broadcast (production - same process)
    const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
    if (!orgClients) return;
    
    orgClients.forEach((client) => {
      const sent = sendToClient(client, { type: 'customFieldsUpdate', customFields: encodedData });
      if (!sent) {
        logger.error(`Failed to send custom fields update to client ${client.id}`);
      }
    });
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to sign token for custom fields broadcast');
  }
}
