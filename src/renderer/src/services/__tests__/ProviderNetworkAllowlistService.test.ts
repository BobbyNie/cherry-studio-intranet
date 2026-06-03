import {
  getProviderAllowedEndpoints,
  getServiceAllowedEndpoints,
  setProviderAllowedEndpoints,
  setServiceAllowedEndpoints
} from '@shared/config/intranet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OFFLINE_PROVIDER_ENDPOINTS_KEY,
  OFFLINE_SERVICE_ENDPOINTS_KEY,
  syncProviderNetworkAllowlist
} from '../ProviderNetworkAllowlistService'

describe('ProviderNetworkAllowlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setProviderAllowedEndpoints([])
    setServiceAllowedEndpoints([])
    window.api = {
      config: {
        set: vi.fn()
      }
    } as any
  })

  afterEach(() => {
    setProviderAllowedEndpoints([])
    setServiceAllowedEndpoints([])
    vi.unstubAllGlobals()
  })

  it('syncs provider and configured service endpoints for offline network guards', () => {
    syncProviderNetworkAllowlist([{ enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' }] as any, [
      { isActive: true, baseUrl: 'http://mcp.internal.local:8787/sse' },
      { isActive: true, registryUrl: 'http://npm.registry.internal/' },
      { isActive: false, baseUrl: 'http://inactive.internal/mcp' }
    ])

    expect(getProviderAllowedEndpoints()).toEqual([
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(getServiceAllowedEndpoints()).toEqual([
      { basePath: '/sse', hostname: 'mcp.internal.local', port: 8787, protocols: ['http'] },
      { basePath: '/', hostname: 'npm.registry.internal', port: 80, protocols: ['http'] }
    ])
    expect(window.api.config.set).toHaveBeenCalledWith(OFFLINE_PROVIDER_ENDPOINTS_KEY, [
      { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['http'] }
    ])
    expect(window.api.config.set).toHaveBeenCalledWith(OFFLINE_SERVICE_ENDPOINTS_KEY, [
      { basePath: '/sse', hostname: 'mcp.internal.local', port: 8787, protocols: ['http'] },
      { basePath: '/', hostname: 'npm.registry.internal', port: 80, protocols: ['http'] }
    ])
  })
})
