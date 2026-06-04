import { describe, expect, it } from 'vitest'

import { isExternalBackupEnabled, isNutstoreBackupEnabled, isS3BackupEnabled, isWebDavBackupEnabled } from './backup'
import { isRemoteLoaderEnabled, isSitemapLoaderEnabled, isWebLoaderEnabled } from './knowledge'
import { isRemoteMcpTransportEnabled, isSseTransportEnabled, isStreamableHttpTransportEnabled } from './mcp'
import { isCherryINEnabled, isCopilotEnabled, isOAuthEnabled } from './oauth'

describe('external service feature gates', () => {
  it('keeps external integrations enabled', () => {
    expect(isWebDavBackupEnabled()).toBe(true)
    expect(isS3BackupEnabled()).toBe(true)
    expect(isNutstoreBackupEnabled()).toBe(true)
    expect(isExternalBackupEnabled()).toBe(true)
    expect(isWebLoaderEnabled()).toBe(true)
    expect(isSitemapLoaderEnabled()).toBe(true)
    expect(isRemoteLoaderEnabled()).toBe(true)
    expect(isSseTransportEnabled()).toBe(true)
    expect(isStreamableHttpTransportEnabled()).toBe(true)
    expect(isRemoteMcpTransportEnabled()).toBe(true)
    expect(isCopilotEnabled()).toBe(true)
    expect(isCherryINEnabled()).toBe(true)
    expect(isOAuthEnabled()).toBe(true)
  })
})
