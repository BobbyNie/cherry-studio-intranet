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

import {
  getProviderAllowedEndpoints,
  getServiceAllowedEndpoints,
  setProviderAllowedEndpoints,
  setServiceAllowedEndpoints
} from '@shared/config/intranet'

import {
  isProviderNetworkAllowlistKey,
  loadProviderNetworkAllowlistFromStore,
  OFFLINE_PROVIDER_ENDPOINTS_KEY,
  OFFLINE_SERVICE_ENDPOINTS_KEY,
  syncProviderNetworkAllowlistFromProviders,
  syncProviderNetworkAllowlistFromRedux
} from '../ProviderNetworkAllowlistService'
import { reduxService } from '../ReduxService'

describe('ProviderNetworkAllowlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setProviderAllowedEndpoints([])
    setServiceAllowedEndpoints([])
  })

  afterEach(() => {
    setProviderAllowedEndpoints([])
    setServiceAllowedEndpoints([])
  })

  it('identifies provider allowlist config keys', () => {
    expect(isProviderNetworkAllowlistKey(OFFLINE_PROVIDER_ENDPOINTS_KEY)).toBe(true)
    expect(isProviderNetworkAllowlistKey(OFFLINE_SERVICE_ENDPOINTS_KEY)).toBe(true)
    expect(isProviderNetworkAllowlistKey('theme')).toBe(false)
  })

  it('loads persisted provider and service endpoints into runtime allowlist', () => {
    mockConfigManager.get.mockImplementation((key: string) => {
      if (key === OFFLINE_PROVIDER_ENDPOINTS_KEY) {
        return [{ basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }]
      }
      if (key === OFFLINE_SERVICE_ENDPOINTS_KEY) {
        return [{ basePath: '/sse', hostname: 'mcp.internal.local', port: 8787, protocols: ['http'] }]
      }
      return []
    })

    loadProviderNetworkAllowlistFromStore()

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(getServiceAllowedEndpoints()).toEqual([
      { basePath: '/sse', hostname: 'mcp.internal.local', port: 8787, protocols: ['http'] }
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

  it('syncs configured MCP endpoints and registries from Redux into service allowlist', async () => {
    vi.mocked(reduxService.select)
      .mockResolvedValueOnce([{ enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' }])
      .mockResolvedValueOnce([
        { isActive: true, baseUrl: 'http://mcp.internal.local:8787/sse' },
        { isActive: true, registryUrl: 'http://npm.registry.internal/' },
        { isActive: false, baseUrl: 'http://inactive.internal/mcp' }
      ])

    await syncProviderNetworkAllowlistFromRedux()

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(getServiceAllowedEndpoints()).toEqual([
      { basePath: '/sse', hostname: 'mcp.internal.local', port: 8787, protocols: ['http'] },
      { basePath: '/', hostname: 'npm.registry.internal', port: 80, protocols: ['http'] }
    ])
    expect(mockConfigManager.set).toHaveBeenCalledWith(OFFLINE_SERVICE_ENDPOINTS_KEY, [
      { basePath: '/sse', hostname: 'mcp.internal.local', port: 8787, protocols: ['http'] },
      { basePath: '/', hostname: 'npm.registry.internal', port: 80, protocols: ['http'] }
    ])
  })
})
