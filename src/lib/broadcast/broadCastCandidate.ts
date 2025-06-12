import { ICandidate } from "../models/candidate";
import { ICandidateHistory } from "../models/history";

// Broadcast candidate updates to all SSE clients
export function broadcastCandidateUpdate(
  candidate: ICandidate & { history?: ICandidateHistory[] }
) {
  const orgId = candidate.organizationId;
  const orgClients = global.sseClients?.get(orgId);
  if (!orgClients) return;

  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    const data = `data: ${JSON.stringify({ type: "candidateUpdate", candidate })}\n\n`;
    const clientsCount = Array.from(global.sseClients.entries()).length;

    client.controller.enqueue(encoder.encode(data));
    client.controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
      )
    );
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
    const data = `data: ${JSON.stringify({ type: "multipleCandidateUpdate", candidates })}\n\n`;
    client.controller.enqueue(encoder.encode(data));
  });
}
export function broadcastLaneUpdate(orgId: string, lanes: string[]) {
  console.log("ORGID: ", orgId);
  const orgClients = global.sseClients?.get(orgId);
  console.log("ORGID: ", orgId, orgClients);
  if (!orgClients) return;
  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    const data = `data: ${JSON.stringify({ type: "lanesUpdate", lanes })}\n\n`;
    const clientsCount = Array.from(global.sseClients.entries()).length;

    client.controller.enqueue(encoder.encode(data));
    client.controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
      )
    );
  });
}
