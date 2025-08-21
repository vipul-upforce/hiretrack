import { signToken } from "../jwt";
import { ICandidate } from "../models/candidate";
import { ICandidateHistory } from "../models/history";
// import { auth } from "../auth";

// Broadcast candidate updates to all SSE clients
export function broadcastCandidateUpdate(
  candidate: ICandidate & { history?: ICandidateHistory[] }
) {
  const orgId = candidate.organizationId;
  const orgClients = global.sseClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    try {
      const encodedSSE = signToken(candidate);
      const data = `data: ${JSON.stringify({ type: "candidateUpdate", candidate: encodedSSE })}\n\n`;
      const clientsCount = Array.from(global.sseClients.entries()).length;
      client.controller.enqueue(encoder.encode(data));
      client.controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
        )
      );
    } catch (error) {
      console.error(`Failed to send message to client ${client.id}:`, error);
    }
  });
}
export function broadcastMultipleCandidateUpdate(
  candidates: (ICandidate & { history?: ICandidateHistory[] })[]
) {
  const orgId = candidates[0]?.organizationId;
  const orgClients = global.sseClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    try {
      const encodedSSE = signToken(candidates);
      const data = `data: ${JSON.stringify({ type: "multipleCandidateUpdate", candidates: encodedSSE })}\n\n`;
      client.controller.enqueue(encoder.encode(data));
    } catch (error) {
      console.error(`Failed to send message to client ${client.id}:`, error);
    }
  });
}
export function broadcastLaneUpdate(
  orgId: string,
  lanes: string[],
  jobId?: string
) {
  const orgClients = global.sseClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    try {
      const data = `data: ${JSON.stringify({ type: "lanesUpdate", lanes })}\n\n`;
      const clientsCount = Array.from(global.sseClients.entries()).length;

      client.controller.enqueue(encoder.encode(data));
      client.controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
        )
      );
    } catch (error) {
      console.error(`Failed to send message to client ${client.id}:`, error);
    }
  });
}
