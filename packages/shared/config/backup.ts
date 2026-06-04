/**
 * WebDAV backup service status
 */
export function isWebDavBackupEnabled(): boolean {
  return true
}

/**
 * S3 backup service status
 */
export function isS3BackupEnabled(): boolean {
  return true
}

/**
 * Nutstore backup service status
 */
export function isNutstoreBackupEnabled(): boolean {
  return true
}

/**
 * Generic check: external backup services enabled
 */
export function isExternalBackupEnabled(): boolean {
  return true
}
