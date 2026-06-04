import {
  getNetworkAllowlistRules,
  normalizeNetworkAllowlistRules,
  urlMatchesNetworkAllowlist
} from '../network/networkAllowlist'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE = '内网版已禁用外部链接'
export const OFFLINE_NETWORK_BLOCKED_MESSAGE = '完全离线版已禁用网络访问'
export const OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE = '网络白名单为空，已禁止所有网络访问'

/** @deprecated Use OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE */
export const OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE = OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE

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
  return isFlagEnabled('CHERRY_OFFLINE_MODE') || isFlagEnabled('CHERRY_INTRANET_MODE')
}

/** @deprecated Use isOfflineMode() */
export function isIntranetMode(): boolean {
  return isOfflineMode()
}

export function isPublicNetworkDisabled(): boolean {
  if (isOfflineMode()) {
    return true
  }
  return isFlagEnabled('CHERRY_DISABLE_PUBLIC_NETWORK')
}

export function isAutoUpdateDisabled(): boolean {
  return isFlagEnabled('CHERRY_DISABLE_AUTO_UPDATE')
}

export function isTelemetryDisabled(): boolean {
  return isFlagEnabled('CHERRY_DISABLE_TELEMETRY')
}

export function isMarketplaceDisabled(): boolean {
  return isFlagEnabled('CHERRY_DISABLE_MARKETPLACE')
}

export function areExternalLinksDisabled(): boolean {
  return isFlagEnabled('CHERRY_DISABLE_EXTERNAL_LINKS')
}

export function parseNetworkAllowlistFromEnv(raw = readEnv('CHERRY_NETWORK_ALLOWLIST')): string[] {
  if (typeof raw !== 'string' || !raw.trim()) {
    return []
  }

  const parts = raw
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean)

  return normalizeNetworkAllowlistRules(parts)
}

function getActiveNetworkAllowlistRules(): string[] {
  return getNetworkAllowlistRules()
}

export { getNetworkAllowlistRules, setNetworkAllowlistRules } from '../network/networkAllowlist'

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

  const rules = getActiveNetworkAllowlistRules()
  if (rules.length === 0) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE)
  }

  if (!urlMatchesNetworkAllowlist(parsed, rules)) {
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
