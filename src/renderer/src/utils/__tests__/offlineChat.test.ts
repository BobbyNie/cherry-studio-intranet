import type { Provider } from '@renderer/types'
import { setOfflineNetworkRuntimeConfig } from '@shared/config/intranet'
import { describe, expect, it } from 'vitest'

import { isOfflineChatConfigured } from '../offlineChat'

describe('isOfflineChatConfigured', () => {
  const baseProvider: Provider = {
    id: 'intranet',
    name: '本机模型服务',
    type: 'openai',
    apiKey: '',
    apiHost: 'http://127.0.0.1:11434/v1',
    enabled: true,
    models: [{ id: 'local-model', provider: 'intranet', name: 'local-model', group: 'local' }]
  }

  it('returns true outside offline mode', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
    expect(isOfflineChatConfigured([])).toBe(true)
  })

  it('returns false when local model service is disabled', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [11434] })
    expect(isOfflineChatConfigured([baseProvider])).toBe(false)
    delete process.env.CHERRY_OFFLINE_MODE
  })

  it('returns true when local provider is enabled with chat models', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })
    expect(isOfflineChatConfigured([baseProvider])).toBe(true)
    delete process.env.CHERRY_OFFLINE_MODE
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })
})
