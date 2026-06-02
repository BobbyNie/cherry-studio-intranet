import { isIntranetMode } from './intranet'

/**
 * Remote MCP transports are disabled in intranet mode since they require
 * access to external network resources (SSE, StreamableHTTP).
 */

/**
 * SSE transport status
 */
export function isSseTransportEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * StreamableHTTP transport status
 */
export function isStreamableHttpTransportEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * Generic check: all remote MCP transports disabled in intranet mode
 */
export function isRemoteMcpTransportEnabled(): boolean {
  return !isIntranetMode()
}
