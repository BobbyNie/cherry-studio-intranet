import { afterEach, describe, expect, it, vi } from 'vitest'

describe('offline renderer defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('exposes only offline-safe model providers by default', async () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { INTRANET_BLOCKED_PROVIDER_IDS, SYSTEM_PROVIDERS } = await import('../providers')

    expect(SYSTEM_PROVIDERS[0]).toMatchObject({
      id: 'intranet',
      name: '企业内网模型服务',
      apiHost: '',
      enabled: false
    })
    expect(SYSTEM_PROVIDERS.map((provider) => provider.id)).toEqual(['intranet', 'ollama'])
    expect(SYSTEM_PROVIDERS.every((provider) => provider.enabled === false)).toBe(true)
    expect(SYSTEM_PROVIDERS.every((provider) => provider.apiHost === '')).toBe(true)
    expect(SYSTEM_PROVIDERS.some((provider) => provider.id === 'openai')).toBe(false)
    expect(INTRANET_BLOCKED_PROVIDER_IDS).toEqual(['zhinao', 'gitee-ai'])
  })

  it('defaults web search to disabled in offline mode', async () => {
    process.env.CHERRY_OFFLINE_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { WEB_SEARCH_PROVIDERS } = await import('../webSearchProviders')

    expect(WEB_SEARCH_PROVIDERS).toEqual([])
  })
})
