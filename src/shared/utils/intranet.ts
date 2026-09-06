const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:'])
const HOST_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
const HOSTNAME_PATTERN = new RegExp(`^(?:${HOST_LABEL})(?:\\.${HOST_LABEL})*$`, 'i')
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/
const IPV4_WILDCARD_PATTERN = /^(?:\d{1,3}\.){1,3}\*$/

export const INTRANET_NETWORK_BLOCKED_MESSAGE = 'Intranet mode blocked this network request'

export interface NetworkAllowlistRule {
  host: string
  port?: number
  kind: 'hostname' | 'hostname-wildcard' | 'ipv4' | 'ipv4-wildcard' | 'ipv6'
}

function readEnvironment(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  const importMetaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return processEnv?.[name] ?? importMetaEnv?.[name] ?? processEnv?.[`VITE_${name}`] ?? importMetaEnv?.[`VITE_${name}`]
}

export function isIntranetMode(): boolean {
  const values = [readEnvironment('CHERRY_INTRANET_MODE'), readEnvironment('CHERRY_OFFLINE_MODE')]
  return values.some((value) => typeof value === 'string' && TRUE_VALUES.has(value.trim().toLowerCase()))
}

export function isPublicNetworkDisabled(): boolean {
  if (isIntranetMode()) return true
  const value = readEnvironment('CHERRY_DISABLE_PUBLIC_NETWORK')
  return typeof value === 'string' && TRUE_VALUES.has(value.trim().toLowerCase())
}

export function isAutoUpdateDisabled(): boolean {
  return isEnvironmentFlagEnabled('CHERRY_DISABLE_AUTO_UPDATE')
}

export function isTelemetryDisabled(): boolean {
  return isEnvironmentFlagEnabled('CHERRY_DISABLE_TELEMETRY')
}

export function isMarketplaceDisabled(): boolean {
  return isEnvironmentFlagEnabled('CHERRY_DISABLE_MARKETPLACE')
}

export function areExternalLinksDisabled(): boolean {
  return isEnvironmentFlagEnabled('CHERRY_DISABLE_EXTERNAL_LINKS')
}

function isEnvironmentFlagEnabled(name: string): boolean {
  const value = readEnvironment(name)
  return typeof value === 'string' && TRUE_VALUES.has(value.trim().toLowerCase())
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

function isValidIpv4(host: string): boolean {
  return IPV4_PATTERN.test(host) && host.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255)
}

function isValidIpv4Wildcard(host: string): boolean {
  if (!IPV4_WILDCARD_PATTERN.test(host)) return false
  return host
    .slice(0, -2)
    .split('.')
    .every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

function isIpv6(host: string): boolean {
  return host.includes(':') && /^[0-9a-f:]+$/i.test(host)
}

function parseHostAndPort(raw: string): { host: string; port?: number } {
  const value = raw.trim()
  if (!value) throw new Error('Network allowlist rule cannot be empty')

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    const url = new URL(value)
    if (!ALLOWED_PROTOCOLS.has(url.protocol) || url.username || url.password) {
      throw new Error('Network allowlist rule must use a permitted URL without credentials')
    }
    return { host: normalizeHost(url.hostname), port: Number(url.port) || defaultPort(url.protocol) }
  }

  if (/[\s/\\]/.test(value)) throw new Error('Network allowlist rule contains invalid characters')

  if (value.startsWith('[')) {
    const closing = value.indexOf(']')
    if (closing < 0) throw new Error('Network allowlist IPv6 rule is invalid')
    const host = normalizeHost(value.slice(0, closing + 1))
    const suffix = value.slice(closing + 1)
    if (suffix && !/^:\d+$/.test(suffix)) throw new Error('Network allowlist port is invalid')
    return { host, port: suffix ? Number(suffix.slice(1)) : undefined }
  }

  const portSeparator = value.lastIndexOf(':')
  if (portSeparator > -1 && value.indexOf(':') === portSeparator) {
    const host = value.slice(0, portSeparator)
    const port = Number(value.slice(portSeparator + 1))
    if (!isValidPort(port)) throw new Error('Network allowlist port is invalid')
    return { host: normalizeHost(host), port }
  }

  return { host: normalizeHost(value) }
}

function defaultPort(protocol: string): number | undefined {
  return protocol === 'http:' || protocol === 'ws:'
    ? 80
    : protocol === 'https:' || protocol === 'wss:'
      ? 443
      : undefined
}

function parseRule(raw: string): NetworkAllowlistRule {
  const { host, port } = parseHostAndPort(raw)
  if (!host || host === '*' || host === '*.' || host.includes('/')) {
    throw new Error('Network allowlist host is invalid')
  }

  let kind: NetworkAllowlistRule['kind']
  if (host.startsWith('*.')) {
    const base = host.slice(2)
    if (!HOSTNAME_PATTERN.test(base)) throw new Error('Network allowlist wildcard host is invalid')
    kind = 'hostname-wildcard'
  } else if (host.includes('*')) {
    if (!isValidIpv4Wildcard(host)) throw new Error('Network allowlist IP wildcard is invalid')
    kind = 'ipv4-wildcard'
  } else if (isValidIpv4(host)) {
    kind = 'ipv4'
  } else if (isIpv6(host)) {
    kind = 'ipv6'
  } else if (HOSTNAME_PATTERN.test(host)) {
    kind = 'hostname'
  } else {
    throw new Error('Network allowlist host is invalid')
  }

  if (port !== undefined && !isValidPort(port)) throw new Error('Network allowlist port is invalid')
  return { host, port, kind }
}

export function normalizeNetworkAllowlistRules(rules: readonly string[]): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const raw of rules) {
    const rule = parseRule(raw)
    const value = rule.port === undefined ? rule.host : `${rule.host}:${rule.port}`
    if (!seen.has(value)) {
      seen.add(value)
      normalized.push(value)
    }
  }
  return normalized
}

export function parseNetworkAllowlist(raw = readEnvironment('CHERRY_NETWORK_ALLOWLIST')): string[] {
  if (!raw?.trim()) return []
  return normalizeNetworkAllowlistRules(
    raw
      .split(/[\n,]/)
      .map((rule) => rule.trim())
      .filter(Boolean)
  )
}

function matchesIpv4Wildcard(host: string, rule: string): boolean {
  const hostParts = host.split('.')
  const ruleParts = rule.split('.')
  return (
    ruleParts.length <= hostParts.length && ruleParts.every((part, index) => part === '*' || part === hostParts[index])
  )
}

function matchesRule(url: URL, rawRule: string): boolean {
  let rule: NetworkAllowlistRule
  try {
    rule = parseRule(rawRule)
  } catch {
    return false
  }
  const host = normalizeHost(url.hostname)
  const port = Number(url.port) || defaultPort(url.protocol)
  if (rule.port !== undefined && port !== rule.port) return false
  if (rule.kind === 'hostname') return host === rule.host
  if (rule.kind === 'hostname-wildcard') return host === rule.host.slice(2) || host.endsWith(`.${rule.host.slice(2)}`)
  if (rule.kind === 'ipv4') return host === rule.host
  if (rule.kind === 'ipv4-wildcard') return matchesIpv4Wildcard(host, rule.host)
  return host === rule.host
}

export function urlMatchesNetworkAllowlist(url: string | URL, rules: readonly string[]): boolean {
  let parsed: URL
  try {
    parsed = typeof url === 'string' ? new URL(url) : url
  } catch {
    return false
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || parsed.username || parsed.password || rules.length === 0) return false
  return rules.some((rule) => matchesRule(parsed, rule))
}

export function assertNetworkAllowed(url: string | URL, rules: readonly string[] = parseNetworkAllowlist()): void {
  if (!isPublicNetworkDisabled()) return
  if (!urlMatchesNetworkAllowlist(url, rules)) throw new Error(`${INTRANET_NETWORK_BLOCKED_MESSAGE}: ${String(url)}`)
}
