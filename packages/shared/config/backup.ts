import { isOfflineMode } from './intranet'

/**
 * External backup services remain available in intranet mode; the central
 * network allowlist guard decides whether the configured endpoint is reachable.
 */

/**
 * WebDAV backup service status
 */
export function isWebDavBackupEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * S3 backup service status
 */
export function isS3BackupEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * Nutstore backup service status
 */
export function isNutstoreBackupEnabled(): boolean {
  return !isOfflineMode()
}

/**
 * Generic check: external backup services are only disabled in full offline mode.
 */
export function isExternalBackupEnabled(): boolean {
  return !isOfflineMode()
}
