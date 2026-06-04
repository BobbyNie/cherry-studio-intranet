import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OfflineNetworkBlockedError, setNetworkAllowlistRules } from '../config/intranet'
import { safeFetch, safeWebSocket } from './safeRequest'

describe('safeRequest', () => {
  const originalEnv = { ...process.env }
  const originalFetch = globalThis.fetch
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_OFFLINE_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    setNetworkAllowlistRules([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    globalThis.fetch = originalFetch
    globalThis.WebSocket = originalWebSocket
    setNetworkAllowlistRules([])
  })

  it('blocks public fetch targets in offline mode', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof fetch

    await expect(safeFetch('https://api.openai.com/v1/models')).rejects.toThrow(OfflineNetworkBlockedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks fetch targets until network allowlist rules are configured', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof fetch

    await expect(safeFetch('http://127.0.0.1:8000/v1/models')).rejects.toThrow(OfflineNetworkBlockedError)

    setNetworkAllowlistRules(['127.0.0.1'])
    const response = new Response('{}', { status: 200 })
    fetchMock.mockResolvedValue(response)

    await expect(safeFetch('http://127.0.0.1:8000/v1/models')).resolves.toBe(response)
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/v1/models', undefined)

    await expect(safeFetch('http://127.0.0.2:8000/v1/models')).rejects.toThrow(OfflineNetworkBlockedError)
  })

  it('blocks public websocket targets in offline mode', () => {
    const webSocketMock = vi.fn(function WebSocketMock() {})
    globalThis.WebSocket = webSocketMock as unknown as typeof WebSocket

    expect(() => safeWebSocket('wss://api.openai.com/realtime')).toThrow(OfflineNetworkBlockedError)
    expect(webSocketMock).not.toHaveBeenCalled()
  })

  it('allows websocket targets when hostname is allowlisted', () => {
    const webSocketMock = vi.fn(function WebSocketMock() {})
    globalThis.WebSocket = webSocketMock as unknown as typeof WebSocket

    setNetworkAllowlistRules(['realtime.intranet.local'])

    expect(() => safeWebSocket('wss://realtime.intranet.local/v1/chat')).not.toThrow()
    expect(() => safeWebSocket('wss://other.intranet.local/v1/chat')).toThrow(OfflineNetworkBlockedError)
    expect(webSocketMock).toHaveBeenCalledTimes(1)
  })
})
