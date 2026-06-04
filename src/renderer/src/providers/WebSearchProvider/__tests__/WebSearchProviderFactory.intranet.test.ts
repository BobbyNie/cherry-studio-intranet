import { afterEach, describe, expect, it, vi } from 'vitest'

describe('WebSearchProviderFactory intranet mode', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('does not reject configured non-SearXNG providers in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const [{ default: WebSearchProviderFactory }, { default: ZhipuProvider }] = await Promise.all([
      import('../WebSearchProviderFactory'),
      import('../ZhipuProvider')
    ])

    const provider = WebSearchProviderFactory.create({
      id: 'zhipu',
      name: 'Zhipu',
      apiHost: 'https://open.bigmodel.cn/api/paas/v4/web_search',
      apiKey: 'test-key'
    })

    expect(provider).toBeInstanceOf(ZhipuProvider)
  })
})
