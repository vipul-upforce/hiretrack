// import { Candidate } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
// import { Candidate } from "../../../server"; // From server.ts

// Define types for SSE client management
interface SSEClient {
  id: number;
  controller: ReadableStreamDefaultController;
}

// Global store for SSE clients (use Redis in production)
declare global {
  var sseClients: Map<number, any>;
}

// Initialize global sseClients
global.sseClients = global.sseClients || new Map<number, SSEClient>();

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );
      const clientsCount = Array.from(global.sseClients.entries()).length;
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
        )
      );

      const clientId = Date.now();
      global.sseClients.set(clientId, { id: clientId, controller });

      // Send heartbeat every 3 seconds
      //   const clients = setInterval(() => {
      //     const clientsCount = Array.from(global.sseClients.entries()).length;
      //     controller.enqueue(
      //       encoder.encode(
      //         `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
      //       )
      //     );
      //   }, 3000);

      // Handle disconnect
      req.signal.addEventListener("abort", () => {
        global.sseClients.delete(clientId);
        // clearInterval(clients);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
          )
        );
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

// // Broadcast candidate updates to all SSE clients
// export function broadcastCandidateUpdate(
//   candidate: ICandidate & { history?: ICandidateHistory[] }
// ) {
//   const encoder = new TextEncoder();
//   global.sseClients.forEach((client: any) => {
//     const data = `data: ${JSON.stringify({ type: "candidateUpdate", candidate })}\n\n`;
//     const clientsCount = Array.from(global.sseClients.entries()).length;

//     client.controller.enqueue(encoder.encode(data));
//     client.controller.enqueue(
//       encoder.encode(
//         `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
//       )
//     );
//   });
// }
// export function broadcastMultipleCandidateUpdate(
//   candidates: (ICandidate & { history?: ICandidateHistory[] })[]
// ) {
//   const encoder = new TextEncoder();
//   global.sseClients.forEach((client: any) => {
//     const data = `data: ${JSON.stringify({ type: "multipleCandidateUpdate", candidates })}\n\n`;
//     client.controller.enqueue(encoder.encode(data));
//   });
// }
// export function broadcastLaneUpdate(lanes: string[]) {
//   const encoder = new TextEncoder();
//   global.sseClients.forEach((client: any) => {
//     const data = `data: ${JSON.stringify({ type: "lanesUpdate", lanes })}\n\n`;
//     const clientsCount = Array.from(global.sseClients.entries()).length;

//     client.controller.enqueue(encoder.encode(data));
//     client.controller.enqueue(
//       encoder.encode(
//         `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
//       )
//     );
//   });
// }
