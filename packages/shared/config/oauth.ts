<<<<<<< HEAD
import { isOfflineMode } from './intranet'

/**
 * OAuth services remain available in intranet mode; the central network
 * allowlist guard decides whether the authorization endpoint is reachable.
 */

=======
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
/**
 * GitHub Copilot OAuth integration status
 */
export function isCopilotEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
=======
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}

/**
 * CherryIN OAuth integration status
 */
export function isCherryINEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
}

/**
 * Generic check: OAuth integrations are only disabled in full offline mode.
 */
export function isOAuthEnabled(): boolean {
  return !isOfflineMode()
=======
  return true
}

/**
 * Generic check: OAuth integrations enabled
 */
export function isOAuthEnabled(): boolean {
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}
