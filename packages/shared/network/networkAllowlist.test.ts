import { afterEach, describe, expect, it } from 'vitest'

import {
  getNetworkAllowlistRules,
  normalizeNetworkAllowlistRules,
  setNetworkAllowlistRules,
  urlMatchesNetworkAllowlist
} from './networkAllowlist'

describe('networkAllowlist', () => {
  afterEach(() => {
    setNetworkAllowlistRules([])
  })

  describe('normalizeNetworkAllowlistRules', () => {
    it('trims, lowercases, dedupes, and extracts hostnames from URLs', () => {
      expect(
        normalizeNetworkAllowlistRules([
          '  COMP.COM  ',
          'https://Api.Comp.Com/v1/chat',
          'comp.com',
          'http://127.0.0.1:11434/v1'
        ])
      ).toEqual(['comp.com', 'api.comp.com', '127.0.0.1'])
    })

    it('rejects invalid rules', () => {
      expect(normalizeNetworkAllowlistRules(['', '   ', '*', '*.', 'not a host!'])).toEqual([])
    })
  })

  describe('urlMatchesNetworkAllowlist', () => {
    it('denies all when rules are empty', () => {
      expect(urlMatchesNetworkAllowlist(new URL('https://comp.com/v1'), [])).toBe(false)
      expect(urlMatchesNetworkAllowlist(new URL('http://127.0.0.1:8080/path'), [])).toBe(false)
    })

    it('allows exact host matches only', () => {
      const rules = ['comp.com']

      expect(urlMatchesNetworkAllowlist(new URL('https://comp.com/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('http://comp.com:8080/oauth'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('https://api.comp.com/v1'), rules)).toBe(false)
      expect(urlMatchesNetworkAllowlist(new URL('https://evilcomp.com/v1'), rules)).toBe(false)
    })

    it('allows wildcard root and multi-level subdomains with DNS boundary', () => {
      const rules = ['*.comp.com']

      expect(urlMatchesNetworkAllowlist(new URL('https://comp.com/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('https://api.comp.com/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('https://aaa.bbb.comp.com/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('https://evilcomp.com/v1'), rules)).toBe(false)
      expect(urlMatchesNetworkAllowlist(new URL('https://notcomp.com/v1'), rules)).toBe(false)
    })

    it('matches IP literals exactly', () => {
      const rules = ['127.0.0.1']

      expect(urlMatchesNetworkAllowlist(new URL('http://127.0.0.1:11434/api'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('http://127.0.0.2:11434/api'), rules)).toBe(false)
    })

    it('ignores port and path when matching hostnames', () => {
      const rules = ['llm-gateway.intranet.local']

      expect(urlMatchesNetworkAllowlist(new URL('http://llm-gateway.intranet.local:8080/v1/chat'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('http://llm-gateway.intranet.local/oauth/token'), rules)).toBe(true)
    })

    it('applies the same hostname rules across http, https, ws, and wss', () => {
      const rules = ['realtime.intranet.local']

      expect(urlMatchesNetworkAllowlist(new URL('http://realtime.intranet.local/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('https://realtime.intranet.local/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('ws://realtime.intranet.local/v1'), rules)).toBe(true)
      expect(urlMatchesNetworkAllowlist(new URL('wss://realtime.intranet.local/v1'), rules)).toBe(true)
    })

    it('uses in-memory rules when rules argument is omitted', () => {
      setNetworkAllowlistRules(['comp.com'])
      expect(urlMatchesNetworkAllowlist(new URL('https://comp.com/v1'))).toBe(true)
      expect(getNetworkAllowlistRules()).toEqual(['comp.com'])
    })
  })
})
