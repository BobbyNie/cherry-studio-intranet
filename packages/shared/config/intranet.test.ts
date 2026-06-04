import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  areExternalLinksDisabled,
  assertNetworkAllowed,
  isAutoUpdateDisabled,
  isIntranetMode,
  isMarketplaceDisabled,
  isOfflineMode,
  isPublicNetworkDisabled,
  isTelemetryDisabled,
  OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE,
  OfflineNetworkBlockedError,
  parseNetworkAllowlistFromEnv,
  sanitizeExternalUrl,
  setNetworkAllowlistRules
} from './intranet'
import * as intranetConfig from './intranet'

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
    delete process.env.CHERRY_NETWORK_ALLOWLIST
    setNetworkAllowlistRules([])
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    setNetworkAllowlistRules([])
  })

  it('detects offline mode and disabled update flags', () => {
    expect(isOfflineMode()).toBe(true)
    expect(isIntranetMode()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isPublicNetworkDisabled()).toBe(true)
  })

  it('keeps feature disable switches explicit when intranet mode enables the central network guard', () => {
    delete process.env.CHERRY_OFFLINE_MODE
    delete process.env.CHERRY_DISABLE_AUTO_UPDATE
    delete process.env.CHERRY_DISABLE_EXTERNAL_LINKS
    delete process.env.CHERRY_DISABLE_MARKETPLACE
    delete process.env.CHERRY_DISABLE_TELEMETRY
    process.env.CHERRY_INTRANET_MODE = 'true'

    expect(isPublicNetworkDisabled()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(false)
    expect(isMarketplaceDisabled()).toBe(false)
    expect(areExternalLinksDisabled()).toBe(false)
    expect(isTelemetryDisabled()).toBe(false)
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBe(
      'https://github.com/CherryHQ/cherry-studio'
    )

    process.env.CHERRY_DISABLE_AUTO_UPDATE = 'true'
    process.env.CHERRY_DISABLE_EXTERNAL_LINKS = 'true'
    process.env.CHERRY_DISABLE_MARKETPLACE = 'true'
    process.env.CHERRY_DISABLE_TELEMETRY = 'true'

    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isMarketplaceDisabled()).toBe(true)
    expect(areExternalLinksDisabled()).toBe(true)
    expect(isTelemetryDisabled()).toBe(true)
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
  })

  it('does not expose legacy local-model offline network settings APIs', () => {
    expect('getDefaultLocalModelPorts' in intranetConfig).toBe(false)
    expect('getOfflineNetworkRuntimeConfig' in intranetConfig).toBe(false)
    expect('setOfflineNetworkRuntimeConfig' in intranetConfig).toBe(false)
    expect('validateLocalModelApiHost' in intranetConfig).toBe(false)
    expect('getProviderAllowedEndpoints' in intranetConfig).toBe(false)
    expect('setProviderAllowedEndpoints' in intranetConfig).toBe(false)
  })

  it('rejects all network access when no allowlist rules are configured', () => {
    expect(() => assertNetworkAllowed('http://localhost:11434/api/tags')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
  })

  it('allows configured hostnames including internal domains regardless of path', () => {
    setNetworkAllowlistRules(['llm-gateway.intranet.local', '127.0.0.1'])

    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/chat/completions')).not.toThrow()
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/oauth/token')).not.toThrow()
    expect(() => assertNetworkAllowed('http://127.0.0.1:11434/api/tags')).not.toThrow()
    expect(() => assertNetworkAllowed('ws://127.0.0.1:11434/ws')).not.toThrow()
  })

  it('allows websocket and https requests to the same allowlisted hostname', () => {
    setNetworkAllowlistRules(['realtime.intranet.local'])

    expect(() => assertNetworkAllowed('wss://realtime.intranet.local/v1/chat')).not.toThrow()
    expect(() => assertNetworkAllowed('https://realtime.intranet.local/v1/chat')).not.toThrow()
  })

  it('rejects unconfigured hostnames even when another allowlisted host exists', () => {
    setNetworkAllowlistRules(['127.0.0.1'])

    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
    expect(() => assertNetworkAllowed('http://127.0.0.2:8080/v1/models')).toThrow(OfflineNetworkBlockedError)
  })

  it('uses empty allowlist message when no rules are configured', () => {
    try {
      assertNetworkAllowed('http://127.0.0.1:11434/api/tags')
      throw new Error('expected blocked error')
    } catch (error) {
      expect(error).toBeInstanceOf(OfflineNetworkBlockedError)
      expect((error as Error).message).toBe(OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE)
    }
  })

  it('parses CHERRY_NETWORK_ALLOWLIST from comma or newline separated env values', () => {
    process.env.CHERRY_NETWORK_ALLOWLIST = 'llm-gateway.intranet.local, *.searxng.intranet.local\n127.0.0.1'

    const rules = parseNetworkAllowlistFromEnv()
    expect(rules).toEqual(['llm-gateway.intranet.local', '*.searxng.intranet.local', '127.0.0.1'])
    setNetworkAllowlistRules(rules)
    expect(() => assertNetworkAllowed('http://search.searxng.intranet.local/search')).not.toThrow()
  })

  it('sanitizes external links when external links are disabled', () => {
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
    expect(sanitizeExternalUrl('mailto:support@cherry-ai.com')).toBeNull()
  })
})
