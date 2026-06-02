import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockConfigManager } = vi.hoisted(() => ({
  mockConfigManager: {
    get: vi.fn(),
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

vi.mock('@main/services/ProviderNetworkAllowlistService', () => ({
  loadProviderNetworkAllowlistFromStore: vi.fn()
}))

import {
  getDefaultLocalModelPorts,
  getOfflineNetworkRuntimeConfig,
  setOfflineNetworkRuntimeConfig
} from '@shared/config/intranet'

import {
  isOfflineNetworkConfigKey,
  loadOfflineNetworkConfigFromStore,
  OFFLINE_NETWORK_CONFIG_KEYS
} from '../OfflineNetworkConfigService'

describe('OfflineNetworkConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })

  afterEach(() => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })

  it('identifies offline network config keys', () => {
    expect(isOfflineNetworkConfigKey(OFFLINE_NETWORK_CONFIG_KEYS.localModelServiceEnabled)).toBe(true)
    expect(isOfflineNetworkConfigKey(OFFLINE_NETWORK_CONFIG_KEYS.localModelApiHost)).toBe(true)
    expect(isOfflineNetworkConfigKey(OFFLINE_NETWORK_CONFIG_KEYS.localModelAllowedPorts)).toBe(true)
    expect(isOfflineNetworkConfigKey('theme')).toBe(false)
  })

  it('loads persisted offline settings into the runtime network guard config', () => {
    mockConfigManager.get.mockImplementation((key: string, fallback: unknown) => {
      if (key === OFFLINE_NETWORK_CONFIG_KEYS.localModelServiceEnabled) {
        return true
      }
      if (key === OFFLINE_NETWORK_CONFIG_KEYS.localModelAllowedPorts) {
        return [11434, 99999, 8080, 11434]
      }
      return fallback
    })

    loadOfflineNetworkConfigFromStore()

    expect(getOfflineNetworkRuntimeConfig()).toEqual({
      localModelServiceEnabled: true,
      allowedPorts: [11434, 8080]
    })
  })

  it('falls back to default local model ports when persisted ports are empty', () => {
    mockConfigManager.get.mockImplementation((key: string, fallback: unknown) => {
      if (key === OFFLINE_NETWORK_CONFIG_KEYS.localModelServiceEnabled) {
        return true
      }
      if (key === OFFLINE_NETWORK_CONFIG_KEYS.localModelAllowedPorts) {
        return []
      }
      return fallback
    })

    loadOfflineNetworkConfigFromStore()

    expect(getOfflineNetworkRuntimeConfig()).toEqual({
      localModelServiceEnabled: true,
      allowedPorts: getDefaultLocalModelPorts()
    })
  })
})
