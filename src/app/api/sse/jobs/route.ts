import { NextRequest, NextResponse } from "next/server";

// Define types for SSE client management
// interface SSEClient {
//   id: number;
//   response: NextResponse;
// }

// Global store for SSE clients (use Redis in production)
// declare global {
//   var sseClients: Map<number, NextResponse>;
// }

// Initialize global sseClients if not exists
global.sseClients = global.sseClients || new Map<number, NextResponse>();

export async function GET(req: NextRequest) {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Set SSE headers
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      };

      // Send initial connection confirmation
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Store client connection
      const clientId = Date.now();
      global.sseClients.set(clientId, new NextResponse(null, { headers }));

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
        );
      }, 3000);

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        global.sseClients.delete(clientId);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// // Function to broadcast candidate updates to all SSE clients
// export function broadcastCandidateUpdate(candidate: any) {
//   global.sseClients.forEach((_, clientId) => {
//     const data = `data: ${JSON.stringify({ type: "candidateUpdate", candidate })}\n\n`;
//     const encoder = new TextEncoder();
//     global.sseClients
//       .get(clientId)
//       ?.body?.getWriter()
//       .write(encoder.encode(data));
//   });
// }
