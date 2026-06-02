import type { Provider } from '@renderer/types'
import { setOfflineNetworkRuntimeConfig } from '@shared/config/intranet'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isOfflineChatConfigured } from '../offlineChat'

describe('isOfflineChatConfigured', () => {
  const originalEnv = { ...process.env }

  const baseProvider: Provider = {
    id: 'intranet',
    name: '企业内网模型服务',
    type: 'openai',
    apiKey: '',
    apiHost: 'http://llm-gateway.intranet.local/v1',
    enabled: true,
    models: [{ id: 'local-model', provider: 'intranet', name: 'local-model', group: 'local' }]
  }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_OFFLINE_MODE
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })

  it('returns true outside offline mode', () => {
    expect(isOfflineChatConfigured([])).toBe(true)
  })

  it('returns false when model service is disabled', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [11434] })
    expect(isOfflineChatConfigured([baseProvider])).toBe(false)
  })

  it('returns true when an enabled provider has chat models and api host', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })
    expect(isOfflineChatConfigured([baseProvider])).toBe(true)
  })

  it('supports internal domain api hosts configured on providers', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [] })
    expect(
      isOfflineChatConfigured([
        {
          ...baseProvider,
          apiHost: 'http://llm-gateway.intranet.local/v1'
        }
      ])
    ).toBe(true)
  })
})
