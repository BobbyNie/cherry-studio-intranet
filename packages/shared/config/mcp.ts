<<<<<<< HEAD
import { isOfflineMode } from './intranet'

/**
 * Remote MCP transports remain available in intranet mode; the central
 * network allowlist guard decides whether the configured endpoint is reachable.
 */

=======
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
/**
 * SSE transport status
 */
export function isSseTransportEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
=======
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}

/**
 * StreamableHTTP transport status
 */
export function isStreamableHttpTransportEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
}

/**
 * Generic check: remote MCP transports are only disabled in full offline mode.
 */
export function isRemoteMcpTransportEnabled(): boolean {
  return !isOfflineMode()
=======
  return true
}

/**
 * Generic check: remote MCP transports enabled
 */
export function isRemoteMcpTransportEnabled(): boolean {
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}
