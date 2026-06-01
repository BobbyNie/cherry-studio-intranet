import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertNetworkAllowed,
  getAllowedHosts,
  isAutoUpdateDisabled,
  isIntranetMode,
  isOfflineMode,
  isPublicNetworkDisabled,
  OfflineNetworkBlockedError,
  sanitizeExternalUrl,
  setOfflineNetworkRuntimeConfig,
  validateLocalModelApiHost
} from './intranet'

describe('offline network config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_OFFLINE_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    process.env.CHERRY_DISABLE_AUTO_UPDATE = 'true'
    process.env.CHERRY_DISABLE_EXTERNAL_LINKS = 'true'
    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_LOCAL_MODEL_ALLOWED_PORTS
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
  })

  it('detects offline mode and disabled update flags', () => {
    expect(isOfflineMode()).toBe(true)
    expect(isIntranetMode()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isPublicNetworkDisabled()).toBe(true)
    expect(getAllowedHosts()).toEqual([])
  })

  it('rejects all network access by default', () => {
    expect(() => assertNetworkAllowed('http://localhost:11434/api/tags')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://10.10.8.20:8000/v1/models')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://192.168.10.9:8000/v1/models')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(OfflineNetworkBlockedError)
  })

  it('allows localhost only when explicitly enabled with matching port', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434, 8080] })

    expect(() => assertNetworkAllowed('http://localhost:11434/api/tags')).not.toThrow()
    expect(() => assertNetworkAllowed('http://127.0.0.1:8080/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://[::1]:11434/api/tags')).not.toThrow()
    expect(() => assertNetworkAllowed('ws://127.0.0.1:8080/ws')).not.toThrow()
    expect(() => assertNetworkAllowed('wss://localhost:8080/ws')).not.toThrow()
  })

  it('rejects localhost without explicit port', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })
    expect(() => assertNetworkAllowed('http://localhost/api/tags')).toThrow(OfflineNetworkBlockedError)
  })

  it('rejects localhost when port is not allowed', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })
    expect(() => assertNetworkAllowed('http://localhost:9999/api/tags')).toThrow(OfflineNetworkBlockedError)
  })

  it('rejects hostname bypass attempts', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })
    expect(() => assertNetworkAllowed('http://localhost.evil.com:11434/')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://127.0.0.1.example.com:11434/')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://user:pass@127.0.0.1:11434/')).toThrow(OfflineNetworkBlockedError)
  })

  it('rejects public and private network targets even when local model is enabled', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434, 8080] })
    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://10.10.8.20:8080/v1/models')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://172.16.1.20:8080/v1/models')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://192.168.10.9:8080/v1/models')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local:8080/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
  })

  it('validates local model api host on save', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })

    expect(validateLocalModelApiHost('http://127.0.0.1:11434/v1').ok).toBe(true)
    expect(validateLocalModelApiHost('http://example.com:11434/v1').ok).toBe(false)
    expect(validateLocalModelApiHost('http://127.0.0.1/v1').ok).toBe(false)
    expect(validateLocalModelApiHost('http://127.0.0.1:9999/v1').ok).toBe(false)
  })

  it('sanitizes external links when external links are disabled', () => {
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
    expect(sanitizeExternalUrl('mailto:support@cherry-ai.com')).toBeNull()
  })
})
