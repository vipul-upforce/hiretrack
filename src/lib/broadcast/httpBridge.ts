/**
 * HTTP Bridge for WebSocket broadcasts in development mode
 * 
 * When running Next.js and WebSocket server as separate processes,
 * this module forwards broadcast requests to the WS server via HTTP.
 */

import logger from '../logger';

/**
 * Get the WS server URL dynamically (env vars may not be available at module load)
 */
function getWsServerUrl(): string | null {
  const port = process.env.WS_PORT;
  return port ? `http://localhost:${port}` : null;
}

/**
 * Check if we're running in separate WS server mode (development)
 * In production, Next.js and WS run in the same process, so no bridge needed
 */
export function isUsingHttpBridge(): boolean {
  const wsServerUrl = getWsServerUrl();
  if (!wsServerUrl) return false;
  
  // If WS_PORT is set AND global.wsClients is empty/undefined,
  // we're in separate process mode and need the HTTP bridge
  const hasLocalClients = global.wsClients?.size > 0;
  return !hasLocalClients;
}

/**
 * Send a broadcast request to the WebSocket server via HTTP
 */
export async function sendViaBridge(params: {
  type: string;
  orgId: string;
  data: Record<string, unknown>;
  recipientId?: string;
}): Promise<boolean> {
  const wsServerUrl = getWsServerUrl();
  if (!wsServerUrl) return false;
  
  try {
    logger.log(`HTTP Bridge: Sending ${params.type} to ${wsServerUrl}/broadcast`);
    
    const response = await fetch(`${wsServerUrl}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      logger.error(`HTTP bridge error: ${response.status}`);
      return false;
    }
    
    const result = await response.json();
    logger.log(`HTTP Bridge: Broadcast result - sent to ${result.sent} clients`);
    return result.success;
  } catch (error) {
    logger.error({ error }, 'HTTP bridge request failed');
    return false;
  }
}
