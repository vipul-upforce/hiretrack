import { signAccessToken } from '@/app/actions/auth';
import { CustomFields } from '@/Custom_Fields/Types/CustomField';
import logger from '../logger';

interface NotificationSSEClient {
  id: number;
  orgId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var sseNotificationClients: Map<string, Map<number, NotificationSSEClient>>;
}

// Broadcast custom fields updates to all SSE clients via notification stream
export async function broadcastCustomFieldsUpdate(
  orgId: string,
  customFields: CustomFields,
) {
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients.forEach(async (client: NotificationSSEClient) => {
    try {
      const encodedSSE = await signAccessToken(customFields, orgId);
      const data = `data: ${JSON.stringify({
        type: 'customFieldsUpdate',
        customFields: encodedSSE,
      })}\n\n`;
      client.controller.enqueue(encoder.encode(data));
    } catch (error) {
      logger.error(
        `Failed to send custom fields update to client ${client.id}:`,
        error,
      );
    }
  });
}
