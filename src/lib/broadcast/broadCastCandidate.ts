import { NextRequest } from "next/server";
import { ICandidate } from "../models/candidate";
import { ICandidateHistory } from "../models/history";
// import { auth } from "../auth";

// Broadcast candidate updates to all SSE clients
export function broadcastCandidateUpdate(
  candidate: ICandidate & { history?: ICandidateHistory[] },
  req?: NextRequest
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
