import { isOfflineMode } from './intranet'

/**
 * OAuth services remain available in intranet mode; the central network
 * allowlist guard decides whether the authorization endpoint is reachable.
 */

/**
 * GitHub Copilot OAuth integration status
 */
export function isCopilotEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * CherryIN OAuth integration status
 */
export function isCherryINEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * Generic check: OAuth integrations are only disabled in full offline mode.
 */
export function isOAuthEnabled(): boolean {
  return !isOfflineMode()
}
