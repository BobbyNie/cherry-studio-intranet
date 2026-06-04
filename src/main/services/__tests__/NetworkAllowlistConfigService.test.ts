import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockConfigManager } = vi.hoisted(() => ({
  mockConfigManager: {
    get: vi.fn(),
    has: vi.fn(),
    set: vi.fn()
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
  isNetworkAllowlistConfigKey,
  loadNetworkAllowlistFromStore,
  NETWORK_ALLOWLIST_CONFIG_KEY,
  syncNetworkAllowlistConfigSet
} from '../NetworkAllowlistConfigService'

describe('NetworkAllowlistConfigService', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CHERRY_INTRANET_MODE: 'true' }
    setNetworkAllowlistRules([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setNetworkAllowlistRules([])
  })

  it('identifies the intranet network allowlist config key', () => {
    expect(isNetworkAllowlistConfigKey(NETWORK_ALLOWLIST_CONFIG_KEY)).toBe(true)
    expect(isNetworkAllowlistConfigKey('offlineProviderAllowedEndpoints')).toBe(false)
  })

  it('loads persisted allowlist rules into the runtime matcher', () => {
    mockConfigManager.has.mockReturnValue(true)
    mockConfigManager.get.mockReturnValue([' https://Gateway.Comp.com:8443/v1 ', '*.comp.com'])

    loadNetworkAllowlistFromStore()

    expect(getNetworkAllowlistRules()).toEqual(['gateway.comp.com', '*.comp.com'])
    expect(() => assertNetworkAllowed('https://aaa.comp.com/path')).not.toThrow()
    expect(mockConfigManager.set).not.toHaveBeenCalled()
  })

  it('seeds from CHERRY_NETWORK_ALLOWLIST only when the config key does not exist', () => {
    process.env.CHERRY_NETWORK_ALLOWLIST = 'comp.com, https://gateway.comp.com/v1\n10.1.2.3'
    mockConfigManager.has.mockReturnValue(false)

    loadNetworkAllowlistFromStore()

    expect(getNetworkAllowlistRules()).toEqual(['comp.com', 'gateway.comp.com', '10.1.2.3'])
    expect(mockConfigManager.set).toHaveBeenCalledWith(NETWORK_ALLOWLIST_CONFIG_KEY, [
      'comp.com',
      'gateway.comp.com',
      '10.1.2.3'
    ])
  })

  it('does not repopulate an explicitly saved empty allowlist from env', () => {
    process.env.CHERRY_NETWORK_ALLOWLIST = 'comp.com'
    mockConfigManager.has.mockReturnValue(true)
    mockConfigManager.get.mockReturnValue([])

    loadNetworkAllowlistFromStore()

    expect(getNetworkAllowlistRules()).toEqual([])
    expect(() => assertNetworkAllowed('https://comp.com')).toThrow()
    expect(mockConfigManager.set).not.toHaveBeenCalled()
  })

  it('normalizes config writes and updates runtime rules', async () => {
    await expect(syncNetworkAllowlistConfigSet(NETWORK_ALLOWLIST_CONFIG_KEY, ['*.Comp.com', '10.1.2.3'])).resolves.toBe(
      true
    )

    expect(getNetworkAllowlistRules()).toEqual(['*.comp.com', '10.1.2.3'])
    expect(mockConfigManager.set).toHaveBeenCalledWith(NETWORK_ALLOWLIST_CONFIG_KEY, ['*.comp.com', '10.1.2.3'], false)
  })

  it('ignores unrelated config writes', async () => {
    await expect(syncNetworkAllowlistConfigSet('theme', ['comp.com'])).resolves.toBe(false)

    expect(getNetworkAllowlistRules()).toEqual([])
    expect(mockConfigManager.set).not.toHaveBeenCalled()
  })
})
