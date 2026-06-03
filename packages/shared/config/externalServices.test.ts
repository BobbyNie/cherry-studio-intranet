import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isExternalBackupEnabled, isNutstoreBackupEnabled, isS3BackupEnabled, isWebDavBackupEnabled } from './backup'
import { isRemoteLoaderEnabled, isSitemapLoaderEnabled, isWebLoaderEnabled } from './knowledge'
import { isRemoteMcpTransportEnabled, isSseTransportEnabled, isStreamableHttpTransportEnabled } from './mcp'
import { isCherryINEnabled, isCopilotEnabled, isOAuthEnabled } from './oauth'

describe('external service feature gates', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_OFFLINE_MODE
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('keeps external integrations enabled outside intranet and offline modes', () => {
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

  it('disables external integrations in intranet mode', () => {
    process.env.CHERRY_INTRANET_MODE = 'true'

    expect(isExternalBackupEnabled()).toBe(false)
    expect(isRemoteLoaderEnabled()).toBe(false)
    expect(isSseTransportEnabled()).toBe(true)
    expect(isStreamableHttpTransportEnabled()).toBe(true)
    expect(isRemoteMcpTransportEnabled()).toBe(true)
    expect(isOAuthEnabled()).toBe(false)
  })

  it('disables external integrations in offline mode', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'

    expect(isExternalBackupEnabled()).toBe(false)
    expect(isRemoteLoaderEnabled()).toBe(false)
    expect(isSseTransportEnabled()).toBe(false)
    expect(isStreamableHttpTransportEnabled()).toBe(false)
    expect(isRemoteMcpTransportEnabled()).toBe(false)
    expect(isOAuthEnabled()).toBe(false)
  })
})
