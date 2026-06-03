import { isFullyOfflineMode } from './intranet'

/**
 * Remote MCP transports are disabled only in fully offline mode.
 * In intranet mode they are guarded by the configured service endpoint allowlist.
 */

/**
 * SSE transport status
 */
export function isSseTransportEnabled(): boolean {
  return !isFullyOfflineMode()
}

/**
 * StreamableHTTP transport status
 */
export function isStreamableHttpTransportEnabled(): boolean {
  return !isFullyOfflineMode()
}

/**
 * Generic check: all remote MCP transports disabled in intranet mode
 */
export function isRemoteMcpTransportEnabled(): boolean {
  return !isFullyOfflineMode()
}
