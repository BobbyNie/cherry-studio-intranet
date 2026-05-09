import { afterEach, describe, expect, it, vi } from 'vitest'

describe('intranet renderer defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('exposes only intranet-safe model providers by default', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { SYSTEM_PROVIDERS } = await import('../providers')

    expect(SYSTEM_PROVIDERS[0]).toMatchObject({
      id: 'intranet',
      name: '企业内网模型服务',
      apiHost: 'http://llm-gateway.intranet.local/v1',
      enabled: true
    })
    expect(SYSTEM_PROVIDERS.map((provider) => provider.id)).toEqual([
      'intranet',
      'new-api',
      'ollama',
      'lmstudio',
      'ovms',
      'gpustack'
    ])
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'openai')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'anthropic')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'gemini')).toBe(false)
  })

  it('defaults web search to intranet SearXNG only', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { WEB_SEARCH_PROVIDERS } = await import('../webSearchProviders')

    expect(WEB_SEARCH_PROVIDERS).toEqual([
      {
        id: 'searxng',
        name: '内网 SearXNG',
        apiHost: 'http://searxng.intranet.local',
        basicAuthUsername: '',
        basicAuthPassword: ''
      }
    ])
  })
})
