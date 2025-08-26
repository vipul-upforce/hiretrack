// import { Candidate } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Define types for SSE client management
interface SSEClient {
  id: number;
  orgId: string; // Added to track organization
  controller: ReadableStreamDefaultController;
}

// Global store for SSE clients, grouped by organization
declare global {
  var sseClients: Map<string, Map<number, SSEClient>>; // Map<orgId, Map<clientId, SSEClient>>
}

// Initialize global sseClients
global.sseClients =
  global.sseClients || new Map<string, Map<number, SSEClient>>();

export async function GET(req: NextRequest) {
  // Authenticate user and get organization info
  const cookie = await auth(req);
  const user = cookie?.user;
  if (!user || !user.organizationId) {
    return new NextResponse("Unauthorized or no organization specified", {
      status: 401,
    });
  }

  const orgId = user.organizationId;

  // Initialize organization-specific client map if it doesn't exist
  if (!global.sseClients.has(orgId)) {
    global.sseClients.set(orgId, new Map<number, SSEClient>());
  }

  const orgClients = global.sseClients?.get(orgId)!;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // Send connection confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", orgId })}\n\n`
        )
      );

      // Send current client count for this organization
      const clientsCount = orgClients.size;
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "clients", clients: clientsCount, orgId })}\n\n`
        )
      );

      const clientId = Date.now();
      orgClients.set(clientId, { id: clientId, orgId, controller });

      const heartbeat = setInterval(() => {
        // THIS IS TO KEEP THE CONNECTION ALIVE - fixes sse timeout and its related issues.
        const clientsCount = orgClients.size;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "clients", clients: clientsCount, orgId })}\n\n`
          )
        );
      }, 20000);

      // Handle disconnect
      req.signal.addEventListener("abort", () => {
        orgClients.delete(clientId);
        if (orgClients.size === 0) {
          global.sseClients.delete(orgId); // Clean up empty organization maps
        }
        clearInterval(heartbeat);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "clients", clients: orgClients.size, orgId })}\n\n`
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
    },
  });
}

// // import { Candidate } from "@/lib/mongodb";
// import { auth } from "@/lib/auth";
// import { NextRequest, NextResponse } from "next/server";
// // import { Candidate } from "../../../server"; // From server.ts

// // Define types for SSE client management
// interface SSEClient {
//   id: number;
//   controller: ReadableStreamDefaultController;
// }

// // Global store for SSE clients
// declare global {
//   var sseClients: Map<number, any>;
// }

// // Initialize global sseClients
// global.sseClients = global.sseClients || new Map<number, SSEClient>();

// export async function GET(req: NextRequest) {
//   // const user = await auth(req);

//   const stream = new ReadableStream({
//     start(controller) {
//       const encoder = new TextEncoder();
//       controller.enqueue(
//         encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
//       );
//       const clientsCount = Array.from(global.sseClients.entries()).length;
//       controller.enqueue(
//         encoder.encode(
//           `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
//         )
//       );

//       const clientId = Date.now();
//       global.sseClients.set(clientId, { id: clientId, controller });

//       // Send heartbeat every 3 seconds
//       //   const clients = setInterval(() => {
//       //     const clientsCount = Array.from(global.sseClients.entries()).length;
//       //     controller.enqueue(
//       //       encoder.encode(
//       //         `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
//       //       )
//       //     );
//       //   }, 3000);

//       // Handle disconnect
//       req.signal.addEventListener("abort", () => {
//         global.sseClients.delete(clientId);
//         // clearInterval(clients);
//         controller.enqueue(
//           encoder.encode(
//             `data: ${JSON.stringify({ type: "clients", clients: clientsCount })}\n\n`
//           )
//         );
//         controller.close();
//       });
//     },
//   });

//   return new NextResponse(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Headers": "Cache-Control",
//     },
//   });
// }
