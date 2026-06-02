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

vi.mock('@main/services/ReduxService', () => ({
  reduxService: {
    select: vi.fn()
  }
}))

import { getProviderAllowedEndpoints, setProviderAllowedEndpoints } from '@shared/config/intranet'

import {
  isProviderNetworkAllowlistKey,
  loadProviderNetworkAllowlistFromStore,
  OFFLINE_PROVIDER_ENDPOINTS_KEY,
  syncProviderNetworkAllowlistFromProviders
} from '../ProviderNetworkAllowlistService'

describe('ProviderNetworkAllowlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setProviderAllowedEndpoints([])
  })

  afterEach(() => {
    setProviderAllowedEndpoints([])
  })

  it('identifies provider allowlist config keys', () => {
    expect(isProviderNetworkAllowlistKey(OFFLINE_PROVIDER_ENDPOINTS_KEY)).toBe(true)
    expect(isProviderNetworkAllowlistKey('theme')).toBe(false)
  })

  it('loads persisted provider endpoints into runtime allowlist', () => {
    mockConfigManager.get.mockReturnValue([{ hostname: 'llm-gateway.intranet.local', port: null, protocols: ['http'] }])

    loadProviderNetworkAllowlistFromStore()

    expect(getProviderAllowedEndpoints()).toEqual([
      { hostname: 'llm-gateway.intranet.local', port: null, protocols: ['http'] }
    ])
  })

  it('syncs enabled provider api hosts into main store', () => {
    syncProviderNetworkAllowlistFromProviders([
      { enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' },
      { enabled: false, apiHost: 'http://ignored.internal/v1' }
    ])

    expect(getProviderAllowedEndpoints()).toEqual([
      { hostname: 'llm-gateway.intranet.local', port: null, protocols: ['http'] }
    ])
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [
      { hostname: 'llm-gateway.intranet.local', port: null, protocols: ['http'] }
    ])
  })
})
