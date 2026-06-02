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
      basePath: '/v1',
      hostname: 'llm-gateway.intranet.local',
      port: 80,
      protocols: ['http']
    })
    expect(parseProviderEndpointUrl('http://127.0.0.1:11434/v1')).toEqual({
      basePath: '/v1',
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
      { enabled: true, apiHost: 'http://127.0.0.1:11434' }
    ])

    expect(
      urlMatchesProviderEndpoints(new URL('http://llm-gateway.intranet.local/v1/chat/completions'), endpoints)
    ).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('http://llm-gateway.intranet.local/oauth/token'), endpoints)).toBe(false)
    expect(urlMatchesProviderEndpoints(new URL('http://llm-gateway.intranet.local/v10/models'), endpoints)).toBe(false)
    expect(urlMatchesProviderEndpoints(new URL('http://llm-gateway.intranet.local:8080/v1/models'), endpoints)).toBe(
      false
    )
    expect(urlMatchesProviderEndpoints(new URL('http://127.0.0.1:11434/api/tags'), endpoints)).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('ws://127.0.0.1:11434/ws'), endpoints)).toBe(false)
    expect(urlMatchesProviderEndpoints(new URL('https://api.openai.com/v1/chat/completions'), endpoints)).toBe(false)
  })

  it('requires explicit websocket provider endpoints before allowing websocket requests', () => {
    const endpoints = extractProviderEndpoints([{ enabled: true, apiHost: 'wss://realtime.intranet.local/v1' }])

    expect(urlMatchesProviderEndpoints(new URL('wss://realtime.intranet.local/v1/chat'), endpoints)).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('https://realtime.intranet.local/v1/chat'), endpoints)).toBe(false)
  })

  it('respects explicit configured ports', () => {
    const endpoints = dedupeProviderEndpoints([
      { basePath: '/v1', hostname: '127.0.0.1', port: 11434, protocols: ['http'] }
    ])

    expect(urlMatchesProviderEndpoints(new URL('http://127.0.0.1:11434/v1'), endpoints)).toBe(true)
    expect(urlMatchesProviderEndpoints(new URL('http://127.0.0.1:8080/v1'), endpoints)).toBe(false)
  })

  it('does not reuse legacy origin-only serialized endpoints', () => {
    expect(
      deserializeProviderEndpoints([{ hostname: 'llm-gateway.intranet.local', port: null, protocols: ['http'] }])
    ).toEqual([])
  })

  it('drops serialized endpoints with empty or unsupported protocols', () => {
    expect(
      deserializeProviderEndpoints([
        { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: [] },
        { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: ['ftp'] },
        { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80 },
        { basePath: '/v1', hostname: 'llm-gateway.intranet.local', port: 80, protocols: 'https' }
      ])
    ).toEqual([])
  })

  it('round-trips serialized provider endpoints', () => {
    const endpoints = extractProviderEndpoints([{ enabled: true, apiHost: 'http://gateway.internal:8080/v1' }])
    expect(deserializeProviderEndpoints(JSON.parse(JSON.stringify(endpoints)))).toEqual(endpoints)
  })
})
