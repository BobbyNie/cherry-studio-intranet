<<<<<<< HEAD
import { isOfflineMode } from './intranet'

/**
 * External backup services remain available in intranet mode; the central
 * network allowlist guard decides whether the configured endpoint is reachable.
 */

=======
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
/**
 * WebDAV backup service status
 */
export function isWebDavBackupEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
=======
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}

/**
 * S3 backup service status
 */
export function isS3BackupEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
=======
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}

/**
 * Nutstore backup service status
 */
export function isNutstoreBackupEnabled(): boolean {
<<<<<<< HEAD
  return !isOfflineMode()
}

/**
 * Generic check: external backup services are only disabled in full offline mode.
 */
export function isExternalBackupEnabled(): boolean {
  return !isOfflineMode()
=======
  return true
}

/**
 * Generic check: external backup services enabled
 */
export function isExternalBackupEnabled(): boolean {
  return true
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
}
