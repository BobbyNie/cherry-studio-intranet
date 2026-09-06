import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  areExternalLinksDisabled,
  isAutoUpdateDisabled,
  isIntranetMode,
  isMarketplaceDisabled,
  isTelemetryDisabled,
  normalizeNetworkAllowlistRules,
  urlMatchesNetworkAllowlist
} from '../intranet'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('intranet network contract', () => {
  it('retains packaged policy without launch-time environment variables', () => {
    vi.stubGlobal('__CHERRY_BUILD_ENV__', {
      CHERRY_INTRANET_MODE: 'true',
      CHERRY_DISABLE_AUTO_UPDATE: 'true',
      CHERRY_DISABLE_TELEMETRY: 'true',
      CHERRY_DISABLE_MARKETPLACE: 'true'
    })
    vi.stubEnv('CHERRY_INTRANET_MODE', 'false')
    expect(isIntranetMode()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isTelemetryDisabled()).toBe(true)
    expect(isMarketplaceDisabled()).toBe(true)
  })

  it('enables the guard for intranet and offline builds', () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    expect(isIntranetMode()).toBe(true)
    vi.stubEnv('CHERRY_INTRANET_MODE', '')
    vi.stubEnv('CHERRY_OFFLINE_MODE', 'true')
    expect(isIntranetMode()).toBe(true)
  })

  it('reads independent product-surface disable switches', () => {
    vi.stubEnv('CHERRY_DISABLE_AUTO_UPDATE', 'true')
    vi.stubEnv('CHERRY_DISABLE_TELEMETRY', '1')
    vi.stubEnv('CHERRY_DISABLE_MARKETPLACE', 'yes')
    vi.stubEnv('CHERRY_DISABLE_EXTERNAL_LINKS', 'on')
    expect(isAutoUpdateDisabled()).toBe(true)
    expect(isTelemetryDisabled()).toBe(true)
    expect(isMarketplaceDisabled()).toBe(true)
    expect(areExternalLinksDisabled()).toBe(true)
  })

  it('denies every network destination for an empty allowlist', () => {
    expect(urlMatchesNetworkAllowlist('http://127.0.0.1:8000/v1', [])).toBe(false)
    expect(urlMatchesNetworkAllowlist('https://api.openai.com/v1', [])).toBe(false)
  })

  it.each([
    ['https://comp.com:8443/a', ['comp.com'], true],
    ['https://a.comp.com', ['comp.com'], false],
    ['https://comp.com', ['*.comp.com'], true],
    ['wss://aaa.bbb.comp.com:555/socket', ['*.comp.com'], true],
    ['https://evilcomp.com', ['*.comp.com'], false],
    ['https://comp.com.evil.test', ['*.comp.com'], false],
    ['http://22.236.10.20:8000/v1', ['22.236.*'], true],
    ['https://22.236.10.20', ['22.236.*:443'], true],
    ['wss://22.236.10.20', ['22.236.*:443'], true],
    ['http://22.236.10.20', ['22.236.*:443'], false],
    ['https://22.237.10.20', ['22.236.*'], false],
    ['https://a.mynet.org:555/v1', ['*.mynet.org:555'], true],
    ['https://mynet.org:555/v1', ['*.mynet.org:555'], true],
    ['https://a.mynet.org', ['*.mynet.org:555'], false],
    ['ws://a.mynet.org/socket', ['*.mynet.org:80'], true],
    ['http://[::1]:8000/v1', ['[::1]:8000'], true],
    ['http://[::1]:8001/v1', ['[::1]:8000'], false],
    ['https://user:secret@comp.com', ['comp.com'], false],
    ['ftp://comp.com/data', ['comp.com'], false],
    ['not a URL', ['comp.com'], false]
  ])('matches %s against %j as %s', (url, rules, expected) => {
    expect(urlMatchesNetworkAllowlist(url, rules)).toBe(expected)
  })

  it('normalizes URL inputs, preserving an explicit or scheme default port', () => {
    expect(
      normalizeNetworkAllowlistRules([' COMP.COM ', 'comp.com', 'https://A.COMP.COM:555/v1', 'https://comp.com/v1'])
    ).toEqual(['comp.com', 'a.comp.com:555', 'comp.com:443'])
  })

  it.each([
    '*',
    '*.com.*',
    '22.999.*',
    '22.*.3.*',
    'comp.com:0',
    'comp.com:65536',
    'comp.com:abc',
    'http://u:p@comp.com',
    'ftp://comp.com',
    '10.0.0.0/8'
  ])('rejects an invalid rule instead of silently dropping it: %s', (rule) => {
    expect(() => normalizeNetworkAllowlistRules([rule])).toThrow()
  })
})
