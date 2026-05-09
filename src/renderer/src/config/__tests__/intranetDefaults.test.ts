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
    expect(SYSTEM_PROVIDERS.map((provider) => provider.id)).toEqual(['intranet', 'ollama'])
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'openai')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'anthropic')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'gemini')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'new-api')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'lmstudio')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'ovms')).toBe(false)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'gpustack')).toBe(false)
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

  it('removes openclaw from default sidebar icons in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { DEFAULT_SIDEBAR_ICONS } = await import('../sidebar')

    expect(DEFAULT_SIDEBAR_ICONS).not.toContain('openclaw')
    expect(DEFAULT_SIDEBAR_ICONS).toContain('minapp')
  })
})
