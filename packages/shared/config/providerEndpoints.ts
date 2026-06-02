export interface ProviderEndpoint {
  hostname: string
  port: number | null
  protocols: string[]
}

export interface ProviderEndpointSource {
  enabled?: boolean
  apiHost?: string
  anthropicApiHost?: string
}

const ALLOWED_PROTOCOLS = new Set(['http', 'https', 'ws', 'wss'])
const HTTP_PROTOCOL_FAMILY = new Set(['http', 'https'])
const WS_PROTOCOL_FAMILY = new Set(['ws', 'wss'])

function normalizeProtocol(protocol: string): string {
  return protocol.replace(/:$/, '').toLowerCase()
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function defaultPortForProtocol(protocol: string): number {
  const normalized = normalizeProtocol(protocol)
  return normalized === 'https' || normalized === 'wss' ? 443 : 80
}

function resolvePort(url: URL): number {
  if (url.port) {
    return Number(url.port)
  }
  return defaultPortForProtocol(url.protocol)
}

export function parseProviderEndpointUrl(rawUrl: string): ProviderEndpoint | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (!ALLOWED_PROTOCOLS.has(normalizeProtocol(parsed.protocol))) {
    return null
  }

  if (parsed.username || parsed.password) {
    return null
  }

  const hostname = normalizeHostname(parsed.hostname)
  if (!hostname) {
    return null
  }

  return {
    hostname,
    port: parsed.port ? Number(parsed.port) : null,
    protocols: [normalizeProtocol(parsed.protocol)]
  }
}

export function extractProviderEndpoints(providers: ProviderEndpointSource[]): ProviderEndpoint[] {
  const endpoints: ProviderEndpoint[] = []

  for (const provider of providers) {
    if (!provider.enabled) {
      continue
    }

    for (const rawUrl of [provider.apiHost, provider.anthropicApiHost]) {
      const endpoint = parseProviderEndpointUrl(rawUrl ?? '')
      if (endpoint) {
        endpoints.push(endpoint)
      }
    }
  }

  return dedupeProviderEndpoints(endpoints)
}

export function dedupeProviderEndpoints(endpoints: ProviderEndpoint[]): ProviderEndpoint[] {
  const seen = new Set<string>()
  const deduped: ProviderEndpoint[] = []

  for (const endpoint of endpoints) {
    const key = `${endpoint.hostname}|${endpoint.port ?? '*'}|${endpoint.protocols.join(',')}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(endpoint)
  }

  return deduped
}

export function urlMatchesProviderEndpoints(url: URL, endpoints: ProviderEndpoint[]): boolean {
  if (endpoints.length === 0) {
    return false
  }

  if (!ALLOWED_PROTOCOLS.has(normalizeProtocol(url.protocol))) {
    return false
  }

  if (url.username || url.password) {
    return false
  }

  const requestHostname = normalizeHostname(url.hostname)
  const requestPort = resolvePort(url)
  const requestProtocol = normalizeProtocol(url.protocol)

  return endpoints.some((endpoint) => {
    if (endpoint.hostname !== requestHostname) {
      return false
    }

    if (endpoint.protocols.length > 0) {
      const endpointProtocols = expandProviderProtocols(endpoint.protocols)
      if (!endpointProtocols.has(requestProtocol)) {
        return false
      }
    }

    if (endpoint.port === null) {
      return true
    }

    return endpoint.port === requestPort
  })
}

function expandProviderProtocols(protocols: string[]): Set<string> {
  const expanded = new Set(protocols.map(normalizeProtocol))

  if (protocols.some((protocol) => HTTP_PROTOCOL_FAMILY.has(normalizeProtocol(protocol)))) {
    for (const protocol of WS_PROTOCOL_FAMILY) {
      expanded.add(protocol)
    }
  }

  if (protocols.some((protocol) => WS_PROTOCOL_FAMILY.has(normalizeProtocol(protocol)))) {
    for (const protocol of HTTP_PROTOCOL_FAMILY) {
      expanded.add(protocol)
    }
  }

  return expanded
}

export function serializeProviderEndpoints(endpoints: ProviderEndpoint[]): string {
  return JSON.stringify(endpoints)
}

export function deserializeProviderEndpoints(raw: unknown): ProviderEndpoint[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const endpoints: ProviderEndpoint[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<ProviderEndpoint>
    if (typeof candidate.hostname !== 'string' || !candidate.hostname.trim()) {
      continue
    }

    const protocols = Array.isArray(candidate.protocols)
      ? candidate.protocols.filter((protocol): protocol is string => typeof protocol === 'string')
      : ['http', 'https']

    endpoints.push({
      hostname: normalizeHostname(candidate.hostname),
      port:
        candidate.port === null || candidate.port === undefined
          ? null
          : Number.isInteger(candidate.port) && candidate.port >= 1 && candidate.port <= 65535
            ? candidate.port
            : null,
      protocols: protocols.map(normalizeProtocol)
    })
  }

  return dedupeProviderEndpoints(endpoints)
}
