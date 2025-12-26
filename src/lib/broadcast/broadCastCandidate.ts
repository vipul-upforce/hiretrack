import { signAccessToken } from '@/app/actions/auth';
import { ICandidate } from '../models/candidate';
import { ICandidateHistory } from '../models/history';
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

// Broadcast candidate updates to all SSE clients via notification stream
export function broadcastCandidateUpdate(
  candidate: ICandidate & { history?: ICandidateHistory[] },
) {
  const orgId = candidate.organizationId;
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach(async (client: NotificationSSEClient) => {
    try {
      const encodedSSE = await signAccessToken(candidate, orgId);
      const data = `data: ${JSON.stringify({ type: 'candidateUpdate', candidate: encodedSSE })}\n\n`;
      const clientsCount = orgClients.size;
      client.controller.enqueue(encoder.encode(data));
      client.controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'clients', clients: clientsCount, orgId })}\n\n`,
        ),
      );
    } catch (error) {
      logger.error(`Failed to send message to client ${client.id}:`, error);
    }
  });
}
export function broadcastMultipleCandidateUpdate(
  candidates: (ICandidate & { history?: ICandidateHistory[] })[],
) {
  const orgId = candidates[0]?.organizationId;
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach(async (client: NotificationSSEClient) => {
    try {
      const encodedSSE = await signAccessToken(candidates, orgId);
      const data = `data: ${JSON.stringify({ type: 'multipleCandidateUpdate', candidates: encodedSSE })}\n\n`;
      client.controller.enqueue(encoder.encode(data));
    } catch (error) {
      logger.error(`Failed to send message to client ${client.id}:`, error);
    }
  });
}
export function broadcastLaneUpdate(
  orgId: string,
  lanes: string[],
  jobId?: string,
) {
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach((client: NotificationSSEClient) => {
    try {
      const data = `data: ${JSON.stringify({ type: 'lanesUpdate', lanes, jobId })}\n\n`;
      const clientsCount = orgClients.size;

      client.controller.enqueue(encoder.encode(data));
      client.controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'clients', clients: clientsCount, orgId })}\n\n`,
        ),
      );
    } catch (error) {
      logger.error(`Failed to send message to client ${client.id}:`, error);
    }
  });
}
