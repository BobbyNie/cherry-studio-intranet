import {
  deserializeProviderEndpoints,
  type ProviderEndpoint,
  serializeProviderEndpoints,
  urlMatchesProviderEndpoints
} from './providerEndpoints'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE = '内网版已禁用外部链接'
export const OFFLINE_NETWORK_BLOCKED_MESSAGE = '完全离线版已禁用网络访问'
export const OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE = '请先在模型 Provider 中配置 API 地址'

let providerAllowedEndpoints: ProviderEndpoint[] = []

const PROVIDER_ENDPOINTS_STORAGE_KEY = 'cherry.providerAllowedEndpoints'

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

export function getProviderAllowedEndpoints(): ProviderEndpoint[] {
  hydrateProviderAllowedEndpointsFromStorage()
  return providerAllowedEndpoints.map((endpoint) => ({
    ...endpoint,
    protocols: [...endpoint.protocols]
  }))
}

export function setProviderAllowedEndpoints(endpoints: ProviderEndpoint[]): void {
  providerAllowedEndpoints = endpoints.map((endpoint) => ({
    ...endpoint,
    protocols: [...endpoint.protocols]
  }))
  persistProviderAllowedEndpoints()
}

function hydrateProviderAllowedEndpointsFromStorage(): void {
  try {
    const raw = globalThis.localStorage?.getItem(PROVIDER_ENDPOINTS_STORAGE_KEY)
    if (!raw) {
      return
    }
    providerAllowedEndpoints = deserializeProviderEndpoints(JSON.parse(raw))
  } catch {
    // Ignore malformed persisted config.
  }
}

function persistProviderAllowedEndpoints(): void {
  try {
    globalThis.localStorage?.setItem(
      PROVIDER_ENDPOINTS_STORAGE_KEY,
      serializeProviderEndpoints(providerAllowedEndpoints)
    )
  } catch {
    // Ignore storage failures (private browsing, etc.).
  }
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

  const endpoints = getProviderAllowedEndpoints()
  if (endpoints.length === 0) {
    throw new OfflineNetworkBlockedError(OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE)
  }

  if (!urlMatchesProviderEndpoints(parsed, endpoints)) {
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

export type { ProviderEndpoint }
