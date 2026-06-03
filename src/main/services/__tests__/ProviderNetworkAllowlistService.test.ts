import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockConfigManager, mockReduxSelect } = vi.hoisted(() => ({
  mockConfigManager: {
    get: vi.fn(),
    set: vi.fn()
  },
  mockReduxSelect: vi.fn()
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
    select: mockReduxSelect
  }
}))

import { assertNetworkAllowed, getProviderAllowedEndpoints, setProviderAllowedEndpoints } from '@shared/config/intranet'
import { extractProviderEndpoints } from '@shared/config/providerEndpoints'

import {
  isProviderNetworkAllowlistKey,
  loadProviderNetworkAllowlistFromStore,
  OFFLINE_PROVIDER_ENDPOINTS_KEY,
  syncProviderNetworkAllowlistConfigSet,
  syncProviderNetworkAllowlistFromProviders,
  syncProviderNetworkAllowlistFromRedux
} from '../ProviderNetworkAllowlistService'

describe('ProviderNetworkAllowlistService', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CHERRY_OFFLINE_MODE: 'true', CHERRY_DISABLE_PUBLIC_NETWORK: 'true' }
    setProviderAllowedEndpoints([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setProviderAllowedEndpoints([])
  })

  it('identifies provider allowlist config keys', () => {
    expect(isProviderNetworkAllowlistKey(OFFLINE_PROVIDER_ENDPOINTS_KEY)).toBe(true)
    expect(isProviderNetworkAllowlistKey('theme')).toBe(false)
  })

  it('loads persisted provider endpoints into runtime allowlist', () => {
    mockConfigManager.get.mockReturnValue([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])

    loadProviderNetworkAllowlistFromStore()

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
  })

  it('syncs enabled provider api hosts into main store', () => {
    syncProviderNetworkAllowlistFromProviders([
      { enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' },
      { enabled: false, apiHost: 'http://ignored.internal/v1' }
    ])

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
  })

  it('refreshes runtime and persisted allowlist from Redux provider state', async () => {
    setProviderAllowedEndpoints(
      extractProviderEndpoints([{ enabled: true, apiHost: 'http://old-gateway.intranet.local/v1' }])
    )
    mockReduxSelect.mockResolvedValue([{ enabled: true, apiHost: 'http://new-gateway.intranet.local/v1' }])

    await syncProviderNetworkAllowlistFromRedux()

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'new-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(() => assertNetworkAllowed('http://new-gateway.intranet.local/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://old-gateway.intranet.local/v1/models')).toThrow()
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [
      { basePath: '/v1', hostname: 'new-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
  })

  it('handles provider allowlist config writes by recalculating from Redux instead of trusting renderer values', async () => {
    mockReduxSelect.mockResolvedValue([{ enabled: true, apiHost: 'http://redux-gateway.intranet.local/v1' }])

    await expect(syncProviderNetworkAllowlistConfigSet(OFFLINE_PROVIDER_ENDPOINTS_KEY)).resolves.toBe(true)

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'redux-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [
      { basePath: '/v1', hostname: 'redux-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
  })

  it('clears stale runtime and persisted allowlist when Redux sync fails', async () => {
    setProviderAllowedEndpoints(
      extractProviderEndpoints([{ enabled: true, apiHost: 'http://stale-gateway.intranet.local/v1' }])
    )
    mockReduxSelect.mockRejectedValue(new Error('store unavailable'))

    await expect(syncProviderNetworkAllowlistFromRedux()).resolves.toBe(false)

    expect(getProviderAllowedEndpoints()).toEqual([])
    expect(() => assertNetworkAllowed('http://stale-gateway.intranet.local/v1/models')).toThrow()
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [])
  })

  it('ignores unrelated config writes', async () => {
    await expect(syncProviderNetworkAllowlistConfigSet('theme')).resolves.toBe(false)

    expect(mockReduxSelect).not.toHaveBeenCalled()
  })
})
