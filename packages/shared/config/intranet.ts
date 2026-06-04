import * as ipaddr from 'ipaddr.js'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE = '内网版已禁用外部链接'
export const OFFLINE_NETWORK_BLOCKED_MESSAGE = '完全离线版已禁用网络访问'
export const NETWORK_ALLOWLIST_RULE_INVALID_MESSAGE = '内网域名白名单规则无效'

let networkAllowlistRules: string[] = []

function getProcessEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
}

function getImportMetaEnv(): Record<string, string | undefined> {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
}

function readEnv(name: string): string | undefined {
  const processEnv = getProcessEnv()
  const importMetaEnv = getImportMetaEnv()
  return processEnv[name] ?? processEnv[`VITE_${name}`] ?? importMetaEnv[name] ?? importMetaEnv[`VITE_${name}`]
}

function isFlagEnabled(name: string): boolean {
  const value = readEnv(name)
  return typeof value === 'string' && TRUE_VALUES.has(value.trim().toLowerCase())
}

export function isOfflineMode(): boolean {
  return isFlagEnabled('CHERRY_OFFLINE_MODE')
}

/** @deprecated Use isOfflineMode() */
export function isIntranetMode(): boolean {
  return isFlagEnabled('CHERRY_INTRANET_MODE') || isOfflineMode()
}

export function isPublicNetworkDisabled(): boolean {
  if (isIntranetMode()) {
    return true
  }
  return isFlagEnabled('CHERRY_DISABLE_PUBLIC_NETWORK')
}

export function isAutoUpdateDisabled(): boolean {
  return isOfflineMode() || isFlagEnabled('CHERRY_DISABLE_AUTO_UPDATE')
}

export function isTelemetryDisabled(): boolean {
  return isOfflineMode() || isFlagEnabled('CHERRY_DISABLE_TELEMETRY')
}

export function isMarketplaceDisabled(): boolean {
  return isOfflineMode() || isFlagEnabled('CHERRY_DISABLE_MARKETPLACE')
}

export function areExternalLinksDisabled(): boolean {
  return isOfflineMode() || isFlagEnabled('CHERRY_DISABLE_EXTERNAL_LINKS')
}

export class OfflineNetworkBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfflineNetworkBlockedError'
  }
}

function normalizeProtocol(protocol: string): string {
  return protocol.replace(/:$/, '').toLowerCase()
}

function isAllowedProtocol(protocol: string): boolean {
  const normalized = normalizeProtocol(protocol)
  return normalized === 'http' || normalized === 'https' || normalized === 'ws' || normalized === 'wss'
}

function hasCredentials(url: URL): boolean {
  return Boolean(url.username || url.password)
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function parseRuleHostname(rawRule: string): string {
  const trimmed = rawRule.trim()
  if (!trimmed) {
    return ''
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    try {
      return normalizeHostname(new URL(trimmed).hostname)
    } catch {
      throw new OfflineNetworkBlockedError(NETWORK_ALLOWLIST_RULE_INVALID_MESSAGE)
    }
  }

  return normalizeHostname(trimmed)
}

function isIpv4Literal(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) {
    return false
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false
    }
    const number = Number(part)
    return number >= 0 && number <= 255 && String(number) === part
  })
}

function normalizeIpLiteral(value: string): string | null {
  if (!ipaddr.isValid(value)) {
    return null
  }

  return ipaddr.parse(value).toNormalizedString()
}

function isHostname(value: string): boolean {
  if (value.length > 253 || value.includes('..')) {
    return false
  }

  return value.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label))
}

function isExactAllowlistRule(value: string): boolean {
  return isIpv4Literal(value) || normalizeIpLiteral(value) !== null || isHostname(value)
}

function normalizeAllowlistRule(rawRule: string): string {
  const hostname = parseRuleHostname(rawRule)
  if (!hostname) {
    return ''
  }

  if (hostname.includes('/') || /\s/.test(hostname)) {
    throw new OfflineNetworkBlockedError(NETWORK_ALLOWLIST_RULE_INVALID_MESSAGE)
  }

  const ipLiteral = normalizeIpLiteral(hostname)
  if (ipLiteral) {
    return ipLiteral
  }

  if (hostname.startsWith('*.')) {
    const baseDomain = hostname.slice(2)
    if (!baseDomain || !isHostname(baseDomain)) {
      throw new OfflineNetworkBlockedError(NETWORK_ALLOWLIST_RULE_INVALID_MESSAGE)
    }
    return `*.${baseDomain}`
  }

  if (hostname.includes(':') || !isExactAllowlistRule(hostname)) {
    throw new OfflineNetworkBlockedError(NETWORK_ALLOWLIST_RULE_INVALID_MESSAGE)
  }

  return hostname
}

export function normalizeNetworkAllowlistRules(rules: readonly string[]): string[] {
  const seen = new Set<string>()
  const normalizedRules: string[] = []

  for (const rule of rules) {
    const normalized = normalizeAllowlistRule(rule)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    normalizedRules.push(normalized)
  }

  return normalizedRules
}

export function setNetworkAllowlistRules(rules: readonly string[]): void {
  networkAllowlistRules = normalizeNetworkAllowlistRules(rules)
}

export function getNetworkAllowlistRules(): string[] {
  return [...networkAllowlistRules]
}

function hostnameMatchesRule(hostname: string, rule: string): boolean {
  if (rule.startsWith('*.')) {
    const baseDomain = rule.slice(2)
    return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)
  }

  return hostname === rule
}

export function urlMatchesNetworkAllowlist(
  url: string | URL,
  rules: readonly string[] = networkAllowlistRules
): boolean {
  const parsed = typeof url === 'string' ? new URL(url) : url
  if (!isAllowedProtocol(parsed.protocol) || hasCredentials(parsed)) {
    return false
  }

  const hostname = normalizeIpLiteral(normalizeHostname(parsed.hostname)) ?? normalizeHostname(parsed.hostname)
  const normalizedRules = normalizeNetworkAllowlistRules(rules)
  return normalizedRules.some((rule) => hostnameMatchesRule(hostname, rule))
}

export function assertNetworkAllowed(url: string): void {
  if (!isPublicNetworkDisabled()) {
    return
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  if (!isAllowedProtocol(parsed.protocol)) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  if (hasCredentials(parsed)) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  if (!urlMatchesNetworkAllowlist(parsed, networkAllowlistRules)) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }
}

export function sanitizeExternalUrl(url: string): string | null {
  if (!areExternalLinksDisabled()) {
    return url
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') {
      return url
    }
    return null
  } catch {
    return null
  }
}
