import { describe, expect, it } from 'vitest'

import {
  dedupeProviderEndpoints,
  deserializeProviderEndpoints,
  extractProviderEndpoints,
  parseProviderEndpointUrl,
  urlMatchesProviderEndpoints
} from './providerEndpoints'

describe('providerEndpoints', () => {
  it('parses provider api hosts including internal domains', () => {
    expect(parseProviderEndpointUrl('http://llm-gateway.intranet.local/v1')).toEqual({
      hostname: 'llm-gateway.intranet.local',
      port: null,
      protocols: ['http']
    })
    expect(parseProviderEndpointUrl('http://127.0.0.1:11434/v1')).toEqual({
      hostname: '127.0.0.1',
      port: 11434,
      protocols: ['http']
    })
  })

  it('extracts endpoints from enabled providers only', () => {
    const endpoints = extractProviderEndpoints([
      {
        enabled: true,
        apiHost: 'http://llm-gateway.intranet.local/v1',
        anthropicApiHost: 'http://anthropic.internal:8080'
      },
      { enabled: false, apiHost: 'http://ignored.internal/v1' },
      { enabled: true, apiHost: 'http://127.0.0.1:11434/v1' }
    ])

    expect(endpoints).toHaveLength(3)
    expect(endpoints.map((endpoint) => endpoint.hostname)).toEqual([
      'llm-gateway.intranet.local',
      'anthropic.internal',
      '127.0.0.1'
    ])
  })

  it('matches configured provider origins for request URLs', () => {
    const endpoints = extractProviderEndpoints([
      { enabled: true, apiHost: 'http://llm-gateway.intranet.local/v1' },
      { enabled: true, apiHost: 'http://127.0.0.1:11434/v1' }
    ])

    expect(
      urlMatchesProviderEndpoints(new URL('http://llm-gateway.intranet.local/v1/chat/completions'), endpoints)
    ).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('http://127.0.0.1:11434/api/tags'), endpoints)).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('https://api.openai.com/v1/chat/completions'), endpoints)).toBe(false)
  })

  it('respects explicit configured ports', () => {
    const endpoints = dedupeProviderEndpoints([{ hostname: '127.0.0.1', port: 11434, protocols: ['http'] }])

    expect(urlMatchesProviderEndpoints(new URL('http://127.0.0.1:11434/v1'), endpoints)).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('http://127.0.0.1:8080/v1'), endpoints)).toBe(false)
  })

  it('round-trips serialized provider endpoints', () => {
    const endpoints = extractProviderEndpoints([{ enabled: true, apiHost: 'http://gateway.internal:8080/v1' }])
    expect(deserializeProviderEndpoints(JSON.parse(JSON.stringify(endpoints)))).toEqual(endpoints)
  })
})
