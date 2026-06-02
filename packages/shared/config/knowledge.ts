import { isIntranetMode } from './intranet'

/**
 * Remote knowledge loaders are disabled in intranet mode since they require
 * access to external network resources (WebLoader for URLs, SitemapLoader).
 */

/**
 * WebLoader (remote URL) status
 */
export function isWebLoaderEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * SitemapLoader status
 */
export function isSitemapLoaderEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * Generic check: all remote loaders disabled in intranet mode
 */
export function isRemoteLoaderEnabled(): boolean {
  return !isIntranetMode()
}
