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

import { assertNetworkAllowed, setNetworkAllowlistRules } from '@shared/config/intranet'

import {
  getProviderNetworkAllowlistRules,
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
    setNetworkAllowlistRules([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setNetworkAllowlistRules([])
  })

  it('identifies provider allowlist config keys', () => {
    expect(isProviderNetworkAllowlistKey(OFFLINE_PROVIDER_ENDPOINTS_KEY)).toBe(true)
    expect(isProviderNetworkAllowlistKey('theme')).toBe(false)
  })

  it('loads persisted hostname rules into runtime allowlist', () => {
    mockConfigManager.get.mockReturnValue(['llm-gateway.intranet.local'])

    loadProviderNetworkAllowlistFromStore()

    expect(getProviderNetworkAllowlistRules()).toEqual(['llm-gateway.intranet.local'])
  })

  it('loads legacy persisted provider endpoints as hostname rules', () => {
    mockConfigManager.get.mockReturnValue([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])

    loadProviderNetworkAllowlistFromStore()

    expect(getProviderNetworkAllowlistRules()).toEqual(['llm-gateway.intranet.local'])
  })

  it('syncs enabled provider api hosts into main store', () => {
    syncProviderNetworkAllowlistFromProviders([
      { enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' },
      { enabled: false, apiHost: 'http://ignored.internal/v1' }
    ])

    expect(getProviderNetworkAllowlistRules()).toEqual(['llm-gateway.intranet.local'])
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, ['llm-gateway.intranet.local'])
  })

  it('refreshes runtime and persisted allowlist from Redux provider state', async () => {
    setNetworkAllowlistRules(['old-gateway.intranet.local'])
    mockReduxSelect.mockResolvedValue([{ enabled: true, apiHost: 'http://new-gateway.intranet.local/v1' }])

    await syncProviderNetworkAllowlistFromRedux()

    expect(getProviderNetworkAllowlistRules()).toEqual(['new-gateway.intranet.local'])
    expect(() => assertNetworkAllowed('http://new-gateway.intranet.local/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://old-gateway.intranet.local/v1/models')).toThrow()
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, ['new-gateway.intranet.local'])
  })

  it('handles provider allowlist config writes by recalculating from Redux instead of trusting renderer values', async () => {
    mockReduxSelect.mockResolvedValue([{ enabled: true, apiHost: 'http://redux-gateway.intranet.local/v1' }])

    await expect(syncProviderNetworkAllowlistConfigSet(OFFLINE_PROVIDER_ENDPOINTS_KEY)).resolves.toBe(true)

    expect(getProviderNetworkAllowlistRules()).toEqual(['redux-gateway.intranet.local'])
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, ['redux-gateway.intranet.local'])
  })

  it('clears stale runtime and persisted allowlist when Redux sync fails', async () => {
    setNetworkAllowlistRules(['stale-gateway.intranet.local'])
    mockReduxSelect.mockRejectedValue(new Error('store unavailable'))

    await expect(syncProviderNetworkAllowlistFromRedux()).resolves.toBe(false)

    expect(getProviderNetworkAllowlistRules()).toEqual([])
    expect(() => assertNetworkAllowed('http://stale-gateway.intranet.local/v1/models')).toThrow()
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [])
  })

  it('ignores unrelated config writes', async () => {
    await expect(syncProviderNetworkAllowlistConfigSet('theme')).resolves.toBe(false)

    expect(mockReduxSelect).not.toHaveBeenCalled()
  })
})
