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
  // let role = null;
  // if (req) {
  //   const cookie = await auth(req);
  //   role = cookie?.user.role;
  // }
  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    // const candidateToBeSent = {
    //   ...candidate,
    //   currentCTC: role === "interviewer" ? undefined : candidate.currentCTC,
    //   expectedCTC: role === "interviewer" ? undefined : candidate.expectedCTC,
    //   customFields: role === "interviewer" ? undefined : candidate.customFields,
    //   history: candidate.history?.filter((entry) =>
    //     role === "admin" || role === "hr"
    //       ? true
    //       : !entry.remark?.id || !entry.remark.isPrivate
    //   ),
    // };
    // console.log("CANDIDATE HISTORY: ", candidateToBeSent.history);
    const encodedSSE = signToken(candidate);
    const data = `data: ${JSON.stringify({ type: "candidateUpdate", candidate: encodedSSE })}\n\n`;

    const clientsCount = Array.from(global.sseClients.entries()).length;
    // console.log("⛔⛔⛔⛔ ", candidate?.followUp);
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
  const encodedSSE = signToken(candidates);
  const orgId = candidates[0]?.organizationId;
  const orgClients = global.sseClients?.get(orgId);
  if (!orgClients) return;
  const encoder = new TextEncoder();
  orgClients?.forEach((client: any) => {
    const data = `data: ${JSON.stringify({ type: "multipleCandidateUpdate", candidates: encodedSSE })}\n\n`;
    client.controller.enqueue(encoder.encode(data));
  });
}
export function broadcastLaneUpdate(orgId: string, lanes: string[], jobId?: string) {
  // console.log("ORGID: ", orgId);
  const orgClients = global.sseClients?.get(orgId);
  // console.log("ORGID: ", orgId, orgClients);
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
