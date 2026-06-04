import { isOfflineMode } from './intranet'

/**
 * Remote MCP transports remain available in intranet mode; the central
 * network allowlist guard decides whether the configured endpoint is reachable.
 */

/**
 * SSE transport status
 */
export function isSseTransportEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * StreamableHTTP transport status
 */
export function isStreamableHttpTransportEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * Generic check: remote MCP transports are only disabled in full offline mode.
 */
export function isRemoteMcpTransportEnabled(): boolean {
  return !isOfflineMode()
}
