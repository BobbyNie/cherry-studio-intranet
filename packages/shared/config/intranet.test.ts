import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertNetworkAllowed,
  isAutoUpdateDisabled,
  isIntranetMode,
  isOfflineMode,
  isPublicNetworkDisabled,
  OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE,
  OfflineNetworkBlockedError,
  sanitizeExternalUrl,
  setProviderAllowedEndpoints
} from './intranet'
import * as intranetConfig from './intranet'
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
    setProviderAllowedEndpoints([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setProviderAllowedEndpoints([])
  })

  it('detects offline mode and disabled update flags', () => {
    expect(isOfflineMode()).toBe(true)
    expect(isIntranetMode()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isPublicNetworkDisabled()).toBe(true)
  })

  it('does not expose legacy local-model offline network settings APIs', () => {
    expect('getDefaultLocalModelPorts' in intranetConfig).toBe(false)
    expect('getOfflineNetworkRuntimeConfig' in intranetConfig).toBe(false)
    expect('setOfflineNetworkRuntimeConfig' in intranetConfig).toBe(false)
    expect('validateLocalModelApiHost' in intranetConfig).toBe(false)
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
        { enabled: true, apiHost: 'http://127.0.0.1:11434' }
      ])
    )

    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/chat/completions')).not.toThrow()
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/oauth/token')).toThrow(
      OfflineNetworkBlockedError
    )
    expect(() => assertNetworkAllowed('http://127.0.0.1:11434/api/tags')).not.toThrow()
    expect(() => assertNetworkAllowed('ws://127.0.0.1:11434/ws')).toThrow(OfflineNetworkBlockedError)
  })

  it('allows websocket requests only when websocket endpoints are explicitly configured', () => {
    setProviderAllowedEndpoints(
      extractProviderEndpoints([{ enabled: true, apiHost: 'wss://realtime.intranet.local/v1' }])
    )

    expect(() => assertNetworkAllowed('wss://realtime.intranet.local/v1/chat')).not.toThrow()
    expect(() => assertNetworkAllowed('https://realtime.intranet.local/v1/chat')).toThrow(OfflineNetworkBlockedError)
  })

  it('rejects unconfigured targets even when another localhost provider endpoint is configured', () => {
    setProviderAllowedEndpoints(extractProviderEndpoints([{ enabled: true, apiHost: 'http://127.0.0.1:11434/v1' }]))

    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
    expect(() => assertNetworkAllowed('http://127.0.0.1:8080/v1/models')).toThrow(OfflineNetworkBlockedError)
  })

  it('requires provider configuration before allowing network access', () => {
    try {
      assertNetworkAllowed('http://127.0.0.1:11434/api/tags')
      throw new Error('expected blocked error')
    } catch (error) {
      expect(error).toBeInstanceOf(OfflineNetworkBlockedError)
      expect((error as Error).message).toBe(OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE)
    }
  })

  it('sanitizes external links when external links are disabled', () => {
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
    expect(sanitizeExternalUrl('mailto:support@cherry-ai.com')).toBeNull()
  })
})
