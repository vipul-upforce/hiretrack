/**
 * Custom server with WebSocket support for real-time notifications
 * This wraps the Next.js standalone server and adds WebSocket handling
 * 
 * Usage: 
 *   - Production: node server-ws.cjs (runs combined Next.js + WebSocket)
 *   - Development: node server-ws.cjs --ws-only (runs WebSocket only on port 3001)
 */

const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const mongoose = require('mongoose');

// Check if running in WebSocket-only mode (for development)
const WS_ONLY_MODE = process.argv.includes('--ws-only');
const WS_PORT = WS_ONLY_MODE ? (process.env.WS_PORT || 3001) : (process.env.PORT || 3000);

// Only import Next.js if not in WS-only mode
let app = null;
let nextHandler = null;

if (!WS_ONLY_MODE) {
  const next = require('next');
  const dev = process.env.NODE_ENV !== 'production';
  const hostname = process.env.HOSTNAME || 'localhost';
  app = next({ dev, hostname, port: parseInt(process.env.PORT || '3000', 10) });
  nextHandler = app.getRequestHandler();
}

const dev = process.env.NODE_ENV !== 'production';

// ============================================================================
// Configuration
// ============================================================================

const PORT = WS_ONLY_MODE ? WS_PORT : (process.env.PORT || 3000);
const HEARTBEAT_INTERVAL = 20000; // 20 seconds
const MONGODB_URI = process.env.MONGODB_URI;

// ============================================================================
// JWT Secret Generator (same as src/lib/jwtSecretGenerator.ts)
// ============================================================================

function generateHash(organizationId) {
  let saltedId = '';
  const first = organizationId.charAt(0);
  const last = organizationId.charAt(organizationId.length - 1);
  saltedId = organizationId
    .replace(/a/gi, '@')
    .replace(/e/gi, '3')
    .replace(/i/gi, '!')
    .replace(/o/gi, '0')
    .replace(/u/gi, '_')
    .replace(/s/gi, '$')
    .replace(/t/gi, '7')
    .replace(/n/gi, 'N')
    .replace(/m/gi, '2')
    .replace(/l/gi, '1')
    .replace(/k/gi, '9')
    .replace(/j/gi, '8')
    .replace(/h/gi, '7');
  const salt = `${first}${saltedId}${last}_${organizationId.length}`;
  return salt;
}

function generateOrgJwtSecret(orgId) {
  if (!orgId) {
    throw new Error('organizationId is required');
  }
  return generateHash(orgId);
}

// ============================================================================
// Token Verification (same logic as src/app/actions/auth.ts)
// ============================================================================

async function verifyAndDecryptToken(token, orgId) {
  try {
    if (!token || !orgId) {
      return { success: false, error: 'Token or organization ID missing' };
    }

    const JWT_SECRET = generateOrgJwtSecret(orgId);
    if (!JWT_SECRET) {
      return { success: false, error: 'JWT_SECRET is not defined' };
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !decoded.user) {
      return { success: false, error: 'Invalid token structure' };
    }

    const bytes = CryptoJS.AES.decrypt(decoded.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    return { success: true, user: decryptedData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Cookie Parser
// ============================================================================

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  });
  
  return cookies;
}

// ============================================================================
// Global WebSocket Client Storage
// Same structure as SSE but with WebSocket instead of ReadableStreamDefaultController
// ============================================================================

/**
 * @typedef {Object} WSClient
 * @property {number} id
 * @property {string} orgId
 * @property {string} userId
 * @property {string} sessionSignature
 * @property {WebSocket} socket
 * @property {NodeJS.Timeout} heartbeatInterval
 */

/** @type {Map<string, Map<number, WSClient>>} */
global.wsClients = new Map();

// Also set sseNotificationClients to point to wsClients for backward compatibility
// This allows broadcast functions to work without changes during transition
global.sseNotificationClients = global.wsClients;

// ============================================================================
// Helper Functions
// ============================================================================

function getUserConnectionCount(orgClients, userId, sessionSignature) {
  let count = 0;
  for (const client of orgClients.values()) {
    if (client.userId === userId && client.sessionSignature === sessionSignature) {
      count += 1;
    }
  }
  return count;
}

function sendToClient(client, data) {
  try {
    if (client.socket.readyState === 1) { // WebSocket.OPEN
      client.socket.send(JSON.stringify(data));
      return true;
    }
  } catch (error) {
    console.error(`Failed to send to client ${client.id}:`, error.message);
  }
  return false;
}

function broadcastTabCount(orgClients, userId, sessionSignature) {
  const currentCount = getUserConnectionCount(orgClients, userId, sessionSignature);
  const message = { type: 'connectionStatus', activeTabs: currentCount };

  for (const client of orgClients.values()) {
    if (client.userId === userId && client.sessionSignature === sessionSignature) {
      sendToClient(client, message);
    }
  }
}

// ============================================================================
// MongoDB Connection for Initial Notification Count
// ============================================================================

let Notification = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    
    // Get or create Notification model
    if (mongoose.models.Notification) {
      Notification = mongoose.models.Notification;
    } else {
      const notificationSchema = new mongoose.Schema({
        organizationId: String,
        recipientId: String,
        isRead: Boolean,
      }, { strict: false });
      Notification = mongoose.model('Notification', notificationSchema);
    }
    
    console.log('WebSocket server connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
  }
}

async function getUnreadCount(orgId, userId) {
  try {
    if (!Notification) {
      await connectToDatabase();
    }
    if (Notification) {
      return await Notification.countDocuments({
        organizationId: orgId,
        recipientId: userId,
        isRead: false,
      });
    }
  } catch (error) {
    console.error('Error getting unread count:', error.message);
  }
  return 0;
}

// ============================================================================
// WebSocket Connection Handler
// ============================================================================

async function handleWebSocketConnection(ws, request) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies.auth_token;
  const orgId = cookies.org_id;
  const sessionSignature = cookies.refresh_token || 'no-session';

  // Authenticate
  if (!token || !orgId) {
    ws.send(JSON.stringify({ type: 'auth_error', error: 'Unauthorized' }));
    ws.close(1008, 'Unauthorized');
    return;
  }

  const { success, user } = await verifyAndDecryptToken(token, orgId);
  
  if (!success || !user || user.role === 'candidate') {
    ws.send(JSON.stringify({ type: 'auth_error', error: 'Unauthorized' }));
    ws.close(1008, 'Unauthorized');
    return;
  }

  const userId = user.id;
  
  if (!userId || !orgId) {
    ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid user data' }));
    ws.close(1008, 'Invalid user data');
    return;
  }

  // Initialize org client map if needed
  if (!global.wsClients.has(orgId)) {
    global.wsClients.set(orgId, new Map());
  }

  const orgClients = global.wsClients.get(orgId);
  const clientId = Date.now() + Math.floor(Math.random() * 1000);

  /** @type {WSClient} */
  const newClient = {
    id: clientId,
    orgId,
    userId,
    sessionSignature,
    socket: ws,
    // Add a controller property for backward compatibility with broadcast functions
    controller: {
      enqueue: (encodedData) => {
        // Convert SSE format to plain JSON
        // SSE format: "data: {json}\n\n"
        const dataStr = encodedData instanceof Uint8Array 
          ? new TextDecoder().decode(encodedData) 
          : encodedData;
        
        // Extract JSON from SSE format
        const match = dataStr.match(/^data: (.+)\n\n$/s);
        if (match) {
          try {
            if (ws.readyState === 1) {
              ws.send(match[1]); // Send just the JSON part
            }
          } catch (e) {
            // Ignore send errors
          }
        }
      },
      desiredSize: 1, // Always indicate we can accept more data
    },
    heartbeatInterval: null,
  };

  // Register client
  orgClients.set(clientId, newClient);
  console.log(`WebSocket client connected: ${clientId} (org: ${orgId}, user: ${userId})`);

  // Send initial connection state
  const initialCount = getUserConnectionCount(orgClients, userId, sessionSignature);
  sendToClient(newClient, {
    type: 'connected',
    orgId,
    userId,
    activeTabs: initialCount,
  });

  // Broadcast tab count to other tabs
  setTimeout(() => {
    if (orgClients.has(clientId)) {
      broadcastTabCount(orgClients, userId, sessionSignature);
    }
  }, 500);

  // Send initial unread notification count
  const unreadCount = await getUnreadCount(orgId, userId);
  sendToClient(newClient, {
    type: 'notificationCountUpdated',
    count: unreadCount,
  });

  // Setup heartbeat
  newClient.heartbeatInterval = setInterval(() => {
    const currentClientsCount = orgClients.size;
    const sent = sendToClient(newClient, {
      type: 'clients',
      clients: currentClientsCount,
      orgId,
    });

    if (sent) {
      broadcastTabCount(orgClients, userId, sessionSignature);
    } else {
      // Client is dead, clean up
      cleanupClient(orgClients, clientId, orgId, userId, sessionSignature, newClient.heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  // Handle client messages (for future bidirectional communication)
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      // Handle ping/pong or other client messages if needed
      if (data.type === 'ping') {
        sendToClient(newClient, { type: 'pong' });
      }
    } catch (e) {
      // Ignore invalid messages
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    cleanupClient(orgClients, clientId, orgId, userId, sessionSignature, newClient.heartbeatInterval);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error.message);
    cleanupClient(orgClients, clientId, orgId, userId, sessionSignature, newClient.heartbeatInterval);
  });
}

function cleanupClient(orgClients, clientId, orgId, userId, sessionSignature, heartbeatInterval) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  orgClients.delete(clientId);
  console.log(`WebSocket client disconnected: ${clientId}`);

  if (orgClients.size === 0) {
    global.wsClients.delete(orgId);
  } else {
    broadcastTabCount(orgClients, userId, sessionSignature);
  }
}

// ============================================================================
// Server Setup
// ============================================================================

async function startServer() {
  let server;

  if (WS_ONLY_MODE) {
    // WebSocket-only mode for development
    // Create a simple HTTP server that handles CORS for WebSocket upgrade
    server = createServer((req, res) => {
      // Handle CORS preflight for WebSocket
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      // Health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'ws-only' }));
        return;
      }
      
      res.writeHead(404);
      res.end('WebSocket server only');
    });
    
    console.log('> Starting WebSocket-only server (development mode)');
  } else {
    // Combined mode - Prepare Next.js
    await app.prepare();
    console.log('> Next.js app prepared');

    // Create HTTP server with Next.js handler
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      nextHandler(req, res, parsedUrl);
    });
  }

  // Connect to MongoDB (optional in dev, will work without it)
  await connectToDatabase();

  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
  });

  wss.on('connection', handleWebSocketConnection);

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Start listening
  server.listen(PORT, '0.0.0.0', () => {
    if (WS_ONLY_MODE) {
      console.log(`> WebSocket-only server running on http://0.0.0.0:${PORT}`);
      console.log(`> WebSocket endpoint: ws://localhost:${PORT}/ws`);
      console.log('> Run "npm run dev" in another terminal for Next.js');
    } else {
      console.log(`> Server with WebSocket support running on http://0.0.0.0:${PORT}`);
      console.log(`> WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    server.close(() => {
      console.log('Server closed');
      mongoose.connection.close();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    server.close(() => {
      console.log('Server closed');
      mongoose.connection.close();
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
