import { beforeEach, describe, expect, it, vi } from 'vitest'

const netFetch = vi.fn()

vi.mock('electron', () => ({
  net: {
    fetch: netFetch
  }
}))

describe('main intranet network guard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    netFetch.mockReset()
  })

  it('installs global fetch and net.fetch guards when intranet mode blocks public network', async () => {
    const originalFetch = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', originalFetch)
    netFetch.mockResolvedValue(undefined)

    const assertNetworkAllowed = vi.fn((url: string) => {
      if (url.includes('openai.com')) {
        throw new Error('blocked')
      }
    })

    vi.doMock('@shared/config/intranet', () => ({
      isPublicNetworkDisabled: vi.fn(() => true),
      assertNetworkAllowed
    }))

    const { installMainIntranetNetworkGuard } = await import('../intranetNetworkGuard')
    const { net } = await import('electron')
    installMainIntranetNetworkGuard()

    await expect(globalThis.fetch('http://10.10.8.20:8000/v1/models')).resolves.toBeUndefined()
    expect(() => globalThis.fetch('https://api.openai.com/v1/models')).toThrow('blocked')
    expect(() => net.fetch('https://api.openai.com/v1/models')).toThrow('blocked')

    expect(assertNetworkAllowed).toHaveBeenCalledWith('http://10.10.8.20:8000/v1/models')
    expect(assertNetworkAllowed).toHaveBeenCalledWith('https://api.openai.com/v1/models')
    expect(originalFetch).toHaveBeenCalledTimes(1)
  })

  it('blocks session web requests for disallowed urls', async () => {
    const assertNetworkAllowed = vi.fn((url: string) => {
      if (url.includes('openai.com')) {
        throw new Error('blocked')
      }
    })

    vi.doMock('@shared/config/intranet', () => ({
      isPublicNetworkDisabled: vi.fn(() => true),
      assertNetworkAllowed
    }))

    const onBeforeRequest = vi.fn()
    const session = {
      webRequest: { onBeforeRequest }
    } as any

    const { installSessionIntranetNetworkGuard } = await import('../intranetNetworkGuard')
    installSessionIntranetNetworkGuard(session)

    expect(onBeforeRequest).toHaveBeenCalledTimes(1)

    const listener = onBeforeRequest.mock.calls[0][1]
    const allowCallback = vi.fn()
    const denyCallback = vi.fn()
    listener({ url: 'http://10.10.8.20:8000/v1/models' }, allowCallback)
    listener({ url: 'https://api.openai.com/v1/models' }, denyCallback)

    expect(allowCallback).toHaveBeenCalledWith({ cancel: false })
    expect(denyCallback).toHaveBeenCalledWith({ cancel: true })
  })
})
