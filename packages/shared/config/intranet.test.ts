import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertNetworkAllowed,
  getAllowedHosts,
  isAutoUpdateDisabled,
  isIntranetMode,
  isOfflineMode,
  isPublicNetworkDisabled,
  OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE,
  OfflineNetworkBlockedError,
  sanitizeExternalUrl,
  setOfflineNetworkRuntimeConfig,
  setProviderAllowedEndpoints,
  validateLocalModelApiHost
} from './intranet'
import { extractProviderEndpoints } from './providerEndpoints'

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
    setProviderAllowedEndpoints([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: false, allowedPorts: [] })
    setProviderAllowedEndpoints([])
  })

  it('detects offline mode and disabled update flags', () => {
    expect(isOfflineMode()).toBe(true)
    expect(isIntranetMode()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isPublicNetworkDisabled()).toBe(true)
    expect(getAllowedHosts()).toEqual([])
  })

  it('rejects all network access when no provider endpoints are configured', () => {
    expect(() => assertNetworkAllowed('http://localhost:11434/api/tags')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
  })

  it('allows configured provider endpoints including internal domains', () => {
    setProviderAllowedEndpoints(
      extractProviderEndpoints([
        { enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' },
        { enabled: true, apiHost: 'http://127.0.0.1:11434/v1' }
      ])
    )

    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/chat/completions')).not.toThrow()
    expect(() => assertNetworkAllowed('http://127.0.0.1:11434/api/tags')).not.toThrow()
    expect(() => assertNetworkAllowed('ws://127.0.0.1:11434/ws')).not.toThrow()
  })

  it('rejects unconfigured targets even when local model service is enabled', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })
    setProviderAllowedEndpoints(extractProviderEndpoints([{ enabled: true, apiHost: 'http://127.0.0.1:11434/v1' }]))

    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
    expect(() => assertNetworkAllowed('http://127.0.0.1:8080/v1/models')).toThrow(OfflineNetworkBlockedError)
  })

  it('requires provider configuration before allowing network access', () => {
    setOfflineNetworkRuntimeConfig({ localModelServiceEnabled: true, allowedPorts: [11434] })

    try {
      assertNetworkAllowed('http://127.0.0.1:11434/api/tags')
      throw new Error('expected blocked error')
    } catch (error) {
      expect(error).toBeInstanceOf(OfflineNetworkBlockedError)
      expect((error as Error).message).toBe(OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE)
    }
  })

  it('validates model api host for internal domains and localhost', () => {
    expect(validateLocalModelApiHost('http://127.0.0.1:11434/v1').ok).toBe(true)
    expect(validateLocalModelApiHost('http://llm-gateway.intranet.local/v1').ok).toBe(true)
    expect(validateLocalModelApiHost('http://10.0.0.8:8000/v1').ok).toBe(true)
    expect(validateLocalModelApiHost('not-a-url').ok).toBe(false)
    expect(validateLocalModelApiHost('http://user:pass@127.0.0.1:11434/v1').ok).toBe(false)
  })

  it('sanitizes external links when external links are disabled', () => {
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
    expect(sanitizeExternalUrl('mailto:support@cherry-ai.com')).toBeNull()
  })
})
