import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('installRendererIntranetNetworkGuard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('does nothing when public network is not disabled', async () => {
    const originalFetch = vi.fn()
    vi.stubGlobal('fetch', originalFetch)

    vi.doMock('@shared/config/intranet', () => ({
      isPublicNetworkDisabled: vi.fn(() => false),
      assertNetworkAllowed: vi.fn()
    }))

    const { installRendererIntranetNetworkGuard } = await import('../intranetNetworkGuard')
    installRendererIntranetNetworkGuard()

    expect(globalThis.fetch).toBe(originalFetch)
  })

  it('guards fetch and blocks disallowed public urls', async () => {
    const originalFetch = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', originalFetch)

    const assertNetworkAllowed = vi.fn((url: string) => {
      if (url.includes('openai.com')) {
        throw new Error('blocked')
      }
    })

    vi.doMock('@shared/config/intranet', () => ({
      isPublicNetworkDisabled: vi.fn(() => true),
      assertNetworkAllowed
    }))

    const { installRendererIntranetNetworkGuard } = await import('../intranetNetworkGuard')
    installRendererIntranetNetworkGuard()

    await expect(globalThis.fetch('http://10.10.8.20:8000/v1/models')).resolves.toBeUndefined()
    expect(() => globalThis.fetch('https://api.openai.com/v1/models')).toThrow('blocked')
    expect(assertNetworkAllowed).toHaveBeenCalledWith('http://10.10.8.20:8000/v1/models')
    expect(assertNetworkAllowed).toHaveBeenCalledWith('https://api.openai.com/v1/models')
    expect(originalFetch).toHaveBeenCalledTimes(1)
  })
})
