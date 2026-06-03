import type { Provider } from '@renderer/types'
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
    models: [{ id: 'intranet-chat', provider: 'intranet', name: 'intranet-chat', group: 'chat' }]
  }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_OFFLINE_MODE
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns true outside offline mode', () => {
    expect(isOfflineChatConfigured([])).toBe(true)
  })

  it('returns true when an enabled provider has chat models and an api host', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    expect(isOfflineChatConfigured([baseProvider])).toBe(true)
  })

  it('returns false when the intranet provider has no configured endpoint', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    expect(isOfflineChatConfigured([{ ...baseProvider, apiHost: '' }])).toBe(false)
  })

  it('supports providers configured with anthropic api hosts only', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'

    expect(
      isOfflineChatConfigured([
        {
          ...baseProvider,
          apiHost: '',
          anthropicApiHost: 'http://anthropic.intranet.local/v1'
        }
      ])
    ).toBe(true)
  })

  it('supports internal domain api hosts configured on providers', () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
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
