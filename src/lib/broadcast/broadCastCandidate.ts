import type { WebSocket } from 'ws';
import { signAccessToken } from '@/app/actions/auth';
import { ICandidate } from '../models/candidate';
import { ICandidateHistory } from '../models/history';
import logger from '../logger';
import { isUsingHttpBridge, sendViaBridge } from './httpBridge';

/**
 * WebSocket client interface for real-time broadcasting
 * Compatible with both WebSocket (production) and SSE (legacy) connections
 */
interface WSClient {
  id: number;
  orgId: string;
  userId: string;
  socket: WebSocket;
  // Backward compatibility with SSE
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
 * Returns false if the client connection is dead
 */
function sendToClient(client: WSClient, data: object): boolean {
  try {
    // WebSocket: Use socket.send directly
    if (client.socket && client.socket.readyState === 1) { // WebSocket.OPEN = 1
      client.socket.send(JSON.stringify(data));
      return true;
    }
    // Fallback: Use controller.enqueue for SSE compatibility
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
 * Normalize history for SSE/WS broadcast. Converts Mongoose Map values in
 * checklistForm.responses to plain objects so they don't serialize as {}.
 * Call before signAccessToken so clients receive full checklist responses.
 */
function normalizeHistoryForBroadcast(
  history: ICandidateHistory[] | undefined | null,
): ICandidateHistory[] {
  if (!history || !Array.isArray(history)) return [];
  return history.map((entry) => {
    const cf = entry.checklistForm;
    if (!cf?.responses) return entry;
    const r = cf.responses;
    const responses =
      r instanceof Map ? Object.fromEntries(r.entries()) : r;
    return {
      ...entry,
      checklistForm: { ...cf, responses },
    };
  });
}

/**
 * Broadcast candidate update to all WebSocket clients in the organization.
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

  try {
    const hasHistory = Array.isArray(candidate.history) && candidate.history.length > 0;
    const candidateToSend = hasHistory
      ? { ...candidate, history: normalizeHistoryForBroadcast(candidate.history) }
      : candidate;
    // CRITICAL FIX: Sign token ONCE, not N times (where N = number of clients)
    const encodedData = await signAccessToken(candidateToSend, orgId);

    // Use HTTP bridge in development (separate WS server)
    if (isUsingHttpBridge()) {
      await sendViaBridge({
        type: 'candidateUpdate',
        orgId,
        data: { candidate: encodedData },
      });
      return;
    }

    // Direct broadcast (production - same process)
    const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
    if (!orgClients || orgClients.size === 0) return;

    const clientsCount = orgClients.size;
    const deadClients: number[] = [];
    
    for (const [clientId, client] of orgClients.entries()) {
      const sent = sendToClient(client, { type: 'candidateUpdate', candidate: encodedData });
      if (sent) {
        sendToClient(client, { type: 'clients', clients: clientsCount, orgId });
      } else {
        deadClients.push(clientId);
        logger.log(`Dead connection detected: client ${clientId}`);
      }
    }

    // Clean up dead connections to prevent memory leaks
    if (deadClients.length > 0) {
      deadClients.forEach((clientId) => orgClients.delete(clientId));
      if (orgClients.size === 0) {
        global.wsClients?.delete(orgId);
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

  try {
    const candidatesToSend = candidates.map((c) =>
      c.history?.length
        ? { ...c, history: normalizeHistoryForBroadcast(c.history) }
        : c,
    );
    // CRITICAL FIX: Sign token ONCE, not N times
    const encodedData = await signAccessToken(candidatesToSend, orgId);

    // Use HTTP bridge in development (separate WS server)
    if (isUsingHttpBridge()) {
      await sendViaBridge({
        type: 'multipleCandidateUpdate',
        orgId,
        data: { candidates: encodedData },
      });
      return;
    }

    // Direct broadcast (production - same process)
    const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
    if (!orgClients || orgClients.size === 0) return;

    const deadClients: number[] = [];

    for (const [clientId, client] of orgClients.entries()) {
      const sent = sendToClient(client, { type: 'multipleCandidateUpdate', candidates: encodedData });
      if (!sent) {
        deadClients.push(clientId);
        logger.log(`Dead connection detected: client ${clientId}`);
      }
    }

    // Clean up dead connections
    if (deadClients.length > 0) {
      deadClients.forEach((clientId) => orgClients.delete(clientId));
      if (orgClients.size === 0) {
        global.wsClients?.delete(orgId);
        global.sseNotificationClients?.delete(orgId);
      }
    }
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to sign token for multiple candidate broadcast');
  }
}

export async function broadcastLaneUpdate(
  orgId: string,
  lanes: string[],
  jobId?: string,
): Promise<void> {
  if (!orgId) return;

  // Use HTTP bridge in development (separate WS server)
  if (isUsingHttpBridge()) {
    await sendViaBridge({
      type: 'lanesUpdate',
      orgId,
      data: { lanes, jobId },
    });
    return;
  }

  // Direct broadcast (production - same process)
  const orgClients = global.wsClients?.get(orgId) ?? global.sseNotificationClients?.get(orgId);
  if (!orgClients || orgClients.size === 0) return;

  const clientsCount = orgClients.size;
  const deadClients: number[] = [];

  for (const [clientId, client] of orgClients.entries()) {
    const sent = sendToClient(client, { type: 'lanesUpdate', lanes, jobId });
    if (sent) {
      sendToClient(client, { type: 'clients', clients: clientsCount, orgId });
    } else {
      deadClients.push(clientId);
      logger.log(`Dead connection detected: client ${clientId}`);
    }
  }

  // Clean up dead connections
  if (deadClients.length > 0) {
    deadClients.forEach((clientId) => orgClients.delete(clientId));
    if (orgClients.size === 0) {
      global.wsClients?.delete(orgId);
      global.sseNotificationClients?.delete(orgId);
    }
  }
}
