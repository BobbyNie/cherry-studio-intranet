export interface ProviderEndpoint {
  basePath: string
  hostname: string
  port: number
  protocols: string[]
}

export interface ProviderEndpointSource {
  enabled?: boolean
  apiHost?: string
  anthropicApiHost?: string
}

const ALLOWED_PROTOCOLS = new Set(['http', 'https', 'ws', 'wss'])

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

function normalizeBasePath(pathname: string): string {
  const normalized = pathname.trim().replace(/\/+$/, '')
  return normalized ? (normalized.startsWith('/') ? normalized : `/${normalized}`) : '/'
}

function requestPathMatchesBasePath(requestPathname: string, basePath: string): boolean {
  const normalizedBasePath = normalizeBasePath(basePath)
  if (normalizedBasePath === '/') {
    return true
  }

  const normalizedRequestPath = normalizeBasePath(requestPathname)
  return normalizedRequestPath === normalizedBasePath || normalizedRequestPath.startsWith(`${normalizedBasePath}/`)
}

function normalizeProtocolList(protocols: string[]): string[] {
  return Array.from(new Set(protocols.map(normalizeProtocol).filter((protocol) => ALLOWED_PROTOCOLS.has(protocol))))
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
    basePath: normalizeBasePath(parsed.pathname),
    hostname,
    port: resolvePort(parsed),
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
    const hostname = normalizeHostname(endpoint.hostname)
    const port = Number(endpoint.port)
    const protocols = normalizeProtocolList(endpoint.protocols)
    if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535 || protocols.length === 0) {
      continue
    }

    const key = `${hostname}|${port}|${normalizeBasePath(endpoint.basePath)}|${protocols.join(',')}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push({
      ...endpoint,
      basePath: normalizeBasePath(endpoint.basePath),
      hostname,
      port,
      protocols
    })
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

    const endpointProtocols = new Set(normalizeProtocolList(endpoint.protocols))
    if (!endpointProtocols.has(requestProtocol)) {
      return false
    }

    if (endpoint.port !== requestPort) {
      return false
    }

    return requestPathMatchesBasePath(url.pathname, endpoint.basePath)
  })
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
    if (typeof candidate.basePath !== 'string') {
      continue
    }

    if (!Array.isArray(candidate.protocols)) {
      continue
    }

    const protocols = normalizeProtocolList(
      candidate.protocols.filter((protocol): protocol is string => typeof protocol === 'string')
    )
    if (protocols.length === 0) {
      continue
    }
    const port = Number(candidate.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      continue
    }

    endpoints.push({
      basePath: normalizeBasePath(candidate.basePath),
      hostname: normalizeHostname(candidate.hostname),
      port,
      protocols
    })
  }

  return dedupeProviderEndpoints(endpoints)
}
