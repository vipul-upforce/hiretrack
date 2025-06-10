import { ICandidate } from "../models/candidate";
import { ICandidateHistory } from "../models/history";

// Broadcast candidate updates to all SSE clients
export function broadcastCandidateUpdate(
  candidate: ICandidate & { history?: ICandidateHistory[] }
) {
  const encoder = new TextEncoder();
  global.sseClients?.forEach((client: any) => {
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
  const encoder = new TextEncoder();
  global.sseClients?.forEach((client: any) => {
    const data = `data: ${JSON.stringify({ type: "multipleCandidateUpdate", candidates })}\n\n`;
    client.controller.enqueue(encoder.encode(data));
  });
}
export function broadcastLaneUpdate(lanes: string[]) {
  const encoder = new TextEncoder();
  global.sseClients?.forEach((client: any) => {
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
