import type { Provider } from '@renderer/types'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createSessionFetch,
  setMainNetworkAllowlistRules as setNetworkAllowlistRules
} from '../../../../../../tests/intranetSessionFetch'

const { probeOllamaModel } = await import('../listModels')

const provider = (apiHost: string): Provider => ({
  id: 'enterprise-ollama',
  name: 'Enterprise Ollama',
  type: 'ollama',
  apiHost,
  apiKey: '',
  models: [],
  extra_headers: { 'X-Tenant': 'engineering' }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  setNetworkAllowlistRules([])
})

describe('Ollama availability probe', () => {
  it('observes live main-process policy changes without a renderer allowlist copy', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    const fetch = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', createSessionFetch(fetch))
    setNetworkAllowlistRules(['models.corp.example'])
    await expect(probeOllamaModel(provider('https://models.corp.example'), 'model')).resolves.toBeUndefined()
    setNetworkAllowlistRules([])
    await expect(probeOllamaModel(provider('https://models.corp.example'), 'model')).rejects.toThrow()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each(['', '/', '/v1', '/api/'])('preserves the enterprise prefix for %s', async (suffix) => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    setNetworkAllowlistRules(['models.corp.example'])
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ details: { family: 'qwen' } })))
    vi.stubGlobal('fetch', createSessionFetch(fetch))
    const controller = new AbortController()
    await probeOllamaModel(provider(`https://models.corp.example/tenant${suffix}`), 'qwen3:8b', controller.signal)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://models.corp.example/tenant/api/show')
    expect(JSON.parse(init.body)).toEqual({ model: 'qwen3:8b' })
    expect(new Headers(init.headers).get('X-Tenant')).toBe('engineering')
    expect(init.signal).toBe(controller.signal)
  })

  it('rejects an unapproved configured endpoint before dispatch', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    setNetworkAllowlistRules([])
    const fetch = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', createSessionFetch(fetch))

    await expect(probeOllamaModel(provider('https://models.corp.example'), 'qwen3:8b')).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('propagates an unavailable model response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"model missing"}', { status: 404 })))
    await expect(probeOllamaModel(provider('https://models.corp.example'), 'missing')).rejects.toThrow()
  })
})
