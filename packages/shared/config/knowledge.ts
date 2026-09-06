<<<<<<< HEAD
import { isOfflineMode } from './intranet'

/**
 * Remote knowledge loaders remain available in intranet mode; the central
 * network allowlist guard decides whether the configured URL is reachable.
 */

=======
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
/**
 * WebLoader (remote URL) status
 */
export function isWebLoaderEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
=======
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}

/**
 * SitemapLoader status
 */
export function isSitemapLoaderEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
}

/**
 * Generic check: remote loaders are only disabled in full offline mode.
 */
export function isRemoteLoaderEnabled(): boolean {
  return !isOfflineMode()
=======
  return true
}

/**
 * Generic check: remote loaders enabled
 */
export function isRemoteLoaderEnabled(): boolean {
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}
