import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  areExternalLinksDisabled,
  assertNetworkAllowed,
  getNetworkAllowlistRules,
  isAutoUpdateDisabled,
  isIntranetMode,
  isMarketplaceDisabled,
  isOfflineMode,
  isPublicNetworkDisabled,
  isTelemetryDisabled,
  normalizeNetworkAllowlistRules,
  OfflineNetworkBlockedError,
  sanitizeExternalUrl,
  setNetworkAllowlistRules,
  urlMatchesNetworkAllowlist
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
    process.env.CHERRY_DISABLE_TELEMETRY = 'true'
    process.env.CHERRY_DISABLE_MARKETPLACE = 'true'
    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_LOCAL_MODEL_ALLOWED_PORTS
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

  it('treats intranet mode as a network allowlist gate, not full offline mode', () => {
    delete process.env.CHERRY_OFFLINE_MODE
    delete process.env.CHERRY_DISABLE_PUBLIC_NETWORK
    delete process.env.CHERRY_DISABLE_AUTO_UPDATE
    delete process.env.CHERRY_DISABLE_EXTERNAL_LINKS
    delete process.env.CHERRY_DISABLE_TELEMETRY
    delete process.env.CHERRY_DISABLE_MARKETPLACE
    process.env.CHERRY_INTRANET_MODE = 'true'

    expect(isIntranetMode()).toBe(true)
    expect(isOfflineMode()).toBe(false)
    expect(isPublicNetworkDisabled()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(false)
    expect(isTelemetryDisabled()).toBe(false)
    expect(isMarketplaceDisabled()).toBe(false)
    expect(areExternalLinksDisabled()).toBe(false)
  })

  it('does not expose legacy local-model offline network settings APIs', () => {
    expect('getDefaultLocalModelPorts' in intranetConfig).toBe(false)
    expect('getOfflineNetworkRuntimeConfig' in intranetConfig).toBe(false)
    expect('setOfflineNetworkRuntimeConfig' in intranetConfig).toBe(false)
    expect('validateLocalModelApiHost' in intranetConfig).toBe(false)
  })

  it('rejects all network access when the allowlist is empty', () => {
    expect(() => assertNetworkAllowed('http://localhost:11434/api/tags')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).toThrow(
      OfflineNetworkBlockedError
    )
  })

  it('normalizes exact hosts, wildcard hosts, IP literals, and URL inputs', () => {
    expect(
      normalizeNetworkAllowlistRules([
        ' Comp.COM ',
        '*.Comp.com',
        'https://Gateway.Comp.com:8443/v1/models',
        '127.0.0.1',
        '10.1.2.3',
        'comp.com'
      ])
    ).toEqual(['comp.com', '*.comp.com', 'gateway.comp.com', '127.0.0.1', '10.1.2.3'])
  })

  it('allows exact hosts without limiting protocol, port, or path', () => {
    setNetworkAllowlistRules(['llm-gateway.intranet.local'])

    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/chat/completions')).not.toThrow()
    expect(() => assertNetworkAllowed('https://llm-gateway.intranet.local:8443/oauth/token')).not.toThrow()
    expect(() => assertNetworkAllowed('ws://llm-gateway.intranet.local/socket')).not.toThrow()
    expect(() => assertNetworkAllowed('wss://llm-gateway.intranet.local/realtime')).not.toThrow()
  })

  it('matches wildcard rules at the DNS boundary including the root domain', () => {
    setNetworkAllowlistRules(['*.comp.com'])

    expect(urlMatchesNetworkAllowlist('https://comp.com', getNetworkAllowlistRules())).toBe(true)
    expect(urlMatchesNetworkAllowlist('https://aaa.bbb.comp.com/path', getNetworkAllowlistRules())).toBe(true)
    expect(urlMatchesNetworkAllowlist('https://evilcomp.com', getNetworkAllowlistRules())).toBe(false)
    expect(urlMatchesNetworkAllowlist('https://comp.com.evil.com', getNetworkAllowlistRules())).toBe(false)
  })

  it('requires exact IP literal matches without localhost or private-range exceptions', () => {
    setNetworkAllowlistRules(['10.1.2.3'])

    expect(() => assertNetworkAllowed('http://10.1.2.3:8080/health')).not.toThrow()
    expect(() => assertNetworkAllowed('http://10.1.2.4:8080/health')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://127.0.0.1:11434/api/tags')).toThrow(OfflineNetworkBlockedError)
  })

  it('requires exact IPv6 literal matches', () => {
    setNetworkAllowlistRules(['2001:db8::1'])

    expect(() => assertNetworkAllowed('http://[2001:db8::1]:8080/health')).not.toThrow()
    expect(() => assertNetworkAllowed('http://[2001:db8::2]:8080/health')).toThrow(OfflineNetworkBlockedError)
    expect(() => assertNetworkAllowed('http://[::1]:11434/api/tags')).toThrow(OfflineNetworkBlockedError)
  })

  it('rejects unsupported protocols and invalid allowlist rules', () => {
    expect(() => normalizeNetworkAllowlistRules(['10.0.0.0/8'])).toThrow(OfflineNetworkBlockedError)
    expect(() => normalizeNetworkAllowlistRules(['*.'])).toThrow(OfflineNetworkBlockedError)

    setNetworkAllowlistRules(['comp.com'])
    expect(() => assertNetworkAllowed('ftp://comp.com/file')).toThrow(OfflineNetworkBlockedError)
  })

  it('sanitizes external links when external links are disabled', () => {
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
    expect(sanitizeExternalUrl('mailto:support@cherry-ai.com')).toBeNull()
  })
})
