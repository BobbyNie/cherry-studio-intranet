import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { safeFetch, safeWebSocket } from './safeRequest'

describe('safeRequest', () => {
  const originalEnv = { ...process.env }
  const originalFetch = globalThis.fetch
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    delete process.env.CHERRY_NETWORK_ALLOWLIST
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    globalThis.fetch = originalFetch
    globalThis.WebSocket = originalWebSocket
  })

  it('blocks public fetch targets before the underlying fetch is called', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof fetch

    await expect(safeFetch('https://api.openai.com/v1/models')).rejects.toThrow('内网版已阻止公网访问：api.openai.com')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows localhost fetch targets', async () => {
    const response = new Response('{}', { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(response)
    globalThis.fetch = fetchMock as typeof fetch

    await expect(safeFetch('http://127.0.0.1:8000/v1/models')).resolves.toBe(response)
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/v1/models', undefined)
  })

  it('blocks public websocket targets before constructing WebSocket', () => {
    const webSocketMock = vi.fn()
    globalThis.WebSocket = webSocketMock as unknown as typeof WebSocket

    expect(() => safeWebSocket('wss://api.openai.com/realtime')).toThrow('内网版已阻止公网访问：api.openai.com')
    expect(webSocketMock).not.toHaveBeenCalled()
  })
})
