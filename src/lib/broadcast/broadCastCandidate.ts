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

/**
 * Broadcast candidate update to all SSE clients in the organization.
 * CRITICAL FIX: Signs token ONCE before broadcasting to all clients (not N times).
 * 
 * Performance impact:
 * - Before: O(N) token signings where N = number of clients (could be 50+)
 * - After: O(1) token signing regardless of client count
 * 
 * Example: With 50 connected clients, moving 20 candidates:
 * - Before: 20 candidates × 50 clients = 1,000 token signings
 * - After: 1 token signing (batch broadcast)
 * 
 * This function is fire-and-forget - errors are handled internally and won't block the caller.
 */
export async function broadcastCandidateUpdate(
  candidate: ICandidate & { history?: ICandidateHistory[] },
): Promise<void> {
  const orgId = candidate.organizationId;
  if (!orgId) {
    logger.warn('broadcastCandidateUpdate: Missing organizationId');
    return;
  }

  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients || orgClients.size === 0) return;

  try {
    // CRITICAL FIX: Sign token ONCE, not N times (where N = number of clients)
    const encodedSSE = await signAccessToken(candidate, orgId);
    const encoder = new TextEncoder();
    const clientsCount = orgClients.size;
    
    const candidateData = `data: ${JSON.stringify({ type: 'candidateUpdate', candidate: encodedSSE })}\n\n`;
    const clientsData = `data: ${JSON.stringify({ type: 'clients', clients: clientsCount, orgId })}\n\n`;

    // Broadcast to all clients with proper error handling
    const deadClients: number[] = [];
    
    for (const [clientId, client] of orgClients.entries()) {
      try {
        // Check if controller is still valid before enqueueing
        if (client.controller.desiredSize !== null) {
          client.controller.enqueue(encoder.encode(candidateData));
          client.controller.enqueue(encoder.encode(clientsData));
        } else {
          deadClients.push(clientId);
        }
      } catch (_error) {
        // Connection is dead, mark for cleanup
        deadClients.push(clientId);
        logger.log(`Dead SSE connection detected: client ${clientId}`);
      }
    }

    // Clean up dead connections to prevent memory leaks
    if (deadClients.length > 0) {
      deadClients.forEach((clientId) => orgClients.delete(clientId));
      if (orgClients.size === 0) {
        global.sseNotificationClients?.delete(orgId);
      }
    }
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to sign token for candidate broadcast');
  }
}

/**
 * Broadcast multiple candidate updates in a single message.
 * CRITICAL FIX: Signs token ONCE before broadcasting to all clients.
 * Use this for bulk operations instead of calling broadcastCandidateUpdate in a loop.
 * 
 * Performance: O(1) token signing regardless of candidate or client count.
 * 
 * This function is fire-and-forget - errors are handled internally and won't block the caller.
 */
export async function broadcastMultipleCandidateUpdate(
  candidates: (ICandidate & { history?: ICandidateHistory[] })[],
): Promise<void> {
  if (!candidates || candidates.length === 0) return;

  const orgId = candidates[0]?.organizationId;
  if (!orgId) {
    logger.warn('broadcastMultipleCandidateUpdate: Missing organizationId');
    return;
  }

  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients || orgClients.size === 0) return;

  try {
    // CRITICAL FIX: Sign token ONCE, not N times
    const encodedSSE = await signAccessToken(candidates, orgId);
    const encoder = new TextEncoder();
    const data = `data: ${JSON.stringify({ type: 'multipleCandidateUpdate', candidates: encodedSSE })}\n\n`;

    const deadClients: number[] = [];

    for (const [clientId, client] of orgClients.entries()) {
      try {
        if (client.controller.desiredSize !== null) {
          client.controller.enqueue(encoder.encode(data));
        } else {
          deadClients.push(clientId);
        }
      } catch (_error) {
        deadClients.push(clientId);
        logger.log(`Dead SSE connection detected: client ${clientId}`);
      }
    }

    // Clean up dead connections
    if (deadClients.length > 0) {
      deadClients.forEach((clientId) => orgClients.delete(clientId));
      if (orgClients.size === 0) {
        global.sseNotificationClients?.delete(orgId);
      }
    }
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to sign token for multiple candidate broadcast');
  }
}

export function broadcastLaneUpdate(
  orgId: string,
  lanes: string[],
  jobId?: string,
): void {
  if (!orgId) return;

  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients || orgClients.size === 0) return;

  const encoder = new TextEncoder();
  const clientsCount = orgClients.size;
  const lanesData = `data: ${JSON.stringify({ type: 'lanesUpdate', lanes, jobId })}\n\n`;
  const clientsData = `data: ${JSON.stringify({ type: 'clients', clients: clientsCount, orgId })}\n\n`;

  const deadClients: number[] = [];

  for (const [clientId, client] of orgClients.entries()) {
    try {
      if (client.controller.desiredSize !== null) {
        client.controller.enqueue(encoder.encode(lanesData));
        client.controller.enqueue(encoder.encode(clientsData));
      } else {
        deadClients.push(clientId);
      }
    } catch (_error) {
      deadClients.push(clientId);
      logger.log(`Dead SSE connection detected: client ${clientId}`);
    }
  }

  // Clean up dead connections
  if (deadClients.length > 0) {
    deadClients.forEach((clientId) => orgClients.delete(clientId));
    if (orgClients.size === 0) {
      global.sseNotificationClients?.delete(orgId);
    }
  }
}
