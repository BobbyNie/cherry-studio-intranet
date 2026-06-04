import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockConfigManager } = vi.hoisted(() => ({
  mockConfigManager: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn()
  }
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}))

vi.mock('@main/services/ConfigManager', () => ({
  configManager: mockConfigManager
}))

import { assertNetworkAllowed, getNetworkAllowlistRules, setNetworkAllowlistRules } from '@shared/config/intranet'

import {
  INTRANET_NETWORK_ALLOWLIST_KEY,
  isIntranetNetworkAllowlistKey,
  loadIntranetNetworkAllowlistFromStore,
  syncIntranetNetworkAllowlistConfigSet
} from '../IntranetNetworkAllowlistService'

describe('IntranetNetworkAllowlistService', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      CHERRY_OFFLINE_MODE: 'true',
      CHERRY_DISABLE_PUBLIC_NETWORK: 'true',
      CHERRY_NETWORK_ALLOWLIST: 'env-gateway.intranet.local'
    }
    setNetworkAllowlistRules([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setNetworkAllowlistRules([])
  })

  it('identifies intranet network allowlist config keys', () => {
    expect(isIntranetNetworkAllowlistKey(INTRANET_NETWORK_ALLOWLIST_KEY)).toBe(true)
    expect(isIntranetNetworkAllowlistKey('theme')).toBe(false)
  })

  it('seeds runtime allowlist from environment and persists it when store key is absent', () => {
    mockConfigManager.has.mockReturnValue(false)

    loadIntranetNetworkAllowlistFromStore()

    expect(getNetworkAllowlistRules()).toEqual(['env-gateway.intranet.local'])
    expect(mockConfigManager.get).not.toHaveBeenCalled()
    expect(mockConfigManager.set).toHaveBeenCalledWith(INTRANET_NETWORK_ALLOWLIST_KEY, ['env-gateway.intranet.local'])
  })

  it('does not refill from environment after an empty allowlist has been persisted', () => {
    mockConfigManager.has.mockReturnValue(true)
    mockConfigManager.get.mockReturnValue([])

    loadIntranetNetworkAllowlistFromStore()

    expect(getNetworkAllowlistRules()).toEqual([])
    expect(mockConfigManager.set).not.toHaveBeenCalled()
    expect(() => assertNetworkAllowed('http://env-gateway.intranet.local/v1/models')).toThrow()
  })

  it('loads persisted rules when store key exists', () => {
    mockConfigManager.has.mockReturnValue(true)
    mockConfigManager.get.mockReturnValue(['stored-gateway.intranet.local'])

    loadIntranetNetworkAllowlistFromStore()

    expect(getNetworkAllowlistRules()).toEqual(['stored-gateway.intranet.local'])
    expect(() => assertNetworkAllowed('http://stored-gateway.intranet.local/v1/models')).not.toThrow()
  })

  it('persists empty allowlist on config set and blocks network access', () => {
    const synced = syncIntranetNetworkAllowlistConfigSet(INTRANET_NETWORK_ALLOWLIST_KEY, [])

    expect(synced).toBe(true)
    expect(getNetworkAllowlistRules()).toEqual([])
    expect(mockConfigManager.set).toHaveBeenCalledWith(INTRANET_NETWORK_ALLOWLIST_KEY, [])
    expect(() => assertNetworkAllowed('http://any-host.intranet.local/v1/models')).toThrow()
  })

  it('normalizes full URL config writes before persisting', () => {
    const synced = syncIntranetNetworkAllowlistConfigSet(INTRANET_NETWORK_ALLOWLIST_KEY, [
      'https://Stored-Gateway.Intranet.Local:8443/v1/chat',
      'stored-gateway.intranet.local'
    ])

    expect(synced).toBe(true)
    expect(getNetworkAllowlistRules()).toEqual(['stored-gateway.intranet.local'])
    expect(mockConfigManager.set).toHaveBeenCalledWith(INTRANET_NETWORK_ALLOWLIST_KEY, [
      'stored-gateway.intranet.local'
    ])
  })

  it('ignores unrelated config writes', () => {
    const synced = syncIntranetNetworkAllowlistConfigSet('theme', ['ignored'])

    expect(synced).toBe(false)
    expect(mockConfigManager.set).not.toHaveBeenCalled()
  })
})
