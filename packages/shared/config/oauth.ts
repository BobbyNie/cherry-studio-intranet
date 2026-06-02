import { isIntranetMode } from './intranet'

/**
 * OAuth services are disabled in intranet mode since they require
 * external network access to authorization servers.
 */

/**
 * GitHub Copilot OAuth integration status
 */
export function isCopilotEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * CherryIN OAuth integration status
 */
export function isCherryINEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * Generic check: all OAuth integrations disabled in intranet mode
 */
export function isOAuthEnabled(): boolean {
  return !isIntranetMode()
}
