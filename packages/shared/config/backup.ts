import { isIntranetMode } from './intranet'

/**
 * External backup services are disabled in intranet mode since they require
 * access to external network resources (WebDAV, S3, Nutstore).
 */

/**
 * WebDAV backup service status
 */
export function isWebDavBackupEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * S3 backup service status
 */
export function isS3BackupEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * Nutstore backup service status
 */
export function isNutstoreBackupEnabled(): boolean {
  return !isIntranetMode()
}

/**
 * Generic check: all external backup services disabled in intranet mode
 */
export function isExternalBackupEnabled(): boolean {
  return !isIntranetMode()
}
