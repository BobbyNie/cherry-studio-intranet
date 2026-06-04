import { isOfflineMode } from './intranet'

/**
 * Remote knowledge loaders remain available in intranet mode; the central
 * network allowlist guard decides whether the configured URL is reachable.
 */

/**
 * WebLoader (remote URL) status
 */
export function isWebLoaderEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * SitemapLoader status
 */
export function isSitemapLoaderEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * Generic check: remote loaders are only disabled in full offline mode.
 */
export function isRemoteLoaderEnabled(): boolean {
  return !isOfflineMode()
}
