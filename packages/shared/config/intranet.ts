import {
  deserializeProviderEndpoints,
  type ProviderEndpoint,
  serializeProviderEndpoints,
  urlMatchesProviderEndpoints
} from './providerEndpoints'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE = '内网版已禁用外部链接'
export const OFFLINE_NETWORK_BLOCKED_MESSAGE = '完全离线版已禁用网络访问'
export const OFFLINE_ENDPOINT_NOT_CONFIGURED_MESSAGE = '请先配置模型 Provider 或内网服务地址'
export const OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE = '请先在模型 Provider 中配置 API 地址'
export const OFFLINE_INVALID_MODEL_API_HOST_MESSAGE = '请输入有效的 HTTP(S) API Base URL'

const DEFAULT_LOCAL_MODEL_PORTS = [11434, 1234, 8080, 8000, 5000, 3000]

/** @deprecated Use OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE */
export const OFFLINE_LOCALHOST_BLOCKED_MESSAGE = OFFLINE_PROVIDER_NOT_CONFIGURED_MESSAGE
/** @deprecated Use OFFLINE_INVALID_MODEL_API_HOST_MESSAGE */
export const OFFLINE_INVALID_LOCAL_HOST_MESSAGE = OFFLINE_INVALID_MODEL_API_HOST_MESSAGE
/** @deprecated Port whitelist is no longer enforced by the offline network guard */
export const OFFLINE_INVALID_PORT_MESSAGE = '端口不在允许列表中'

export interface OfflineNetworkRuntimeConfig {
  localModelServiceEnabled: boolean
  allowedPorts: number[]
}

let offlineNetworkRuntimeConfig: OfflineNetworkRuntimeConfig = {
  localModelServiceEnabled: false,
  allowedPorts: []
}

let providerAllowedEndpoints: ProviderEndpoint[] = []
let serviceAllowedEndpoints: ProviderEndpoint[] = []

const OFFLINE_NETWORK_CONFIG_STORAGE_KEY = 'cherry.offlineNetworkConfig'
const PROVIDER_ENDPOINTS_STORAGE_KEY = 'cherry.providerAllowedEndpoints'
const SERVICE_ENDPOINTS_STORAGE_KEY = 'cherry.serviceAllowedEndpoints'

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

export function isFullyOfflineMode(): boolean {
  return isFlagEnabled('CHERRY_OFFLINE_MODE')
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

export function getDefaultLocalModelPorts(): number[] {
  return [...DEFAULT_LOCAL_MODEL_PORTS]
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

export function getServiceAllowedEndpoints(): ProviderEndpoint[] {
  hydrateServiceAllowedEndpointsFromStorage()
  return serviceAllowedEndpoints.map((endpoint) => ({
    ...endpoint,
    protocols: [...endpoint.protocols]
  }))
}

export function setServiceAllowedEndpoints(endpoints: ProviderEndpoint[]): void {
  serviceAllowedEndpoints = endpoints.map((endpoint) => ({
    ...endpoint,
    protocols: [...endpoint.protocols]
  }))
  persistServiceAllowedEndpoints()
}

export function getOfflineNetworkRuntimeConfig(): OfflineNetworkRuntimeConfig {
  hydrateOfflineNetworkRuntimeConfigFromStorage()
  return { ...offlineNetworkRuntimeConfig }
}

export function setOfflineNetworkRuntimeConfig(config: Partial<OfflineNetworkRuntimeConfig>): void {
  offlineNetworkRuntimeConfig = {
    localModelServiceEnabled: config.localModelServiceEnabled ?? offlineNetworkRuntimeConfig.localModelServiceEnabled,
    allowedPorts: config.allowedPorts ?? offlineNetworkRuntimeConfig.allowedPorts
  }
  persistOfflineNetworkRuntimeConfig()
}

function hydrateOfflineNetworkRuntimeConfigFromStorage(): void {
  try {
    const raw = globalThis.localStorage?.getItem(OFFLINE_NETWORK_CONFIG_STORAGE_KEY)
    if (!raw) {
      return
    }
    const parsed = JSON.parse(raw) as Partial<OfflineNetworkRuntimeConfig>
    offlineNetworkRuntimeConfig = {
      localModelServiceEnabled: Boolean(parsed.localModelServiceEnabled),
      allowedPorts: normalizePortList(parsed.allowedPorts)
    }
  } catch {
    // Ignore malformed persisted config.
  }
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

function hydrateServiceAllowedEndpointsFromStorage(): void {
  try {
    const raw = globalThis.localStorage?.getItem(SERVICE_ENDPOINTS_STORAGE_KEY)
    if (!raw) {
      return
    }
    serviceAllowedEndpoints = deserializeProviderEndpoints(JSON.parse(raw))
  } catch {
    // Ignore malformed persisted config.
  }
}

function persistOfflineNetworkRuntimeConfig(): void {
  try {
    globalThis.localStorage?.setItem(OFFLINE_NETWORK_CONFIG_STORAGE_KEY, JSON.stringify(offlineNetworkRuntimeConfig))
  } catch {
    // Ignore storage failures (private browsing, etc.).
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

function persistServiceAllowedEndpoints(): void {
  try {
    globalThis.localStorage?.setItem(SERVICE_ENDPOINTS_STORAGE_KEY, serializeProviderEndpoints(serviceAllowedEndpoints))
  } catch {
    // Ignore storage failures (private browsing, etc.).
  }
}

export function normalizePortList(ports: unknown): number[] {
  if (!Array.isArray(ports)) {
    return []
  }

  return Array.from(
    new Set(ports.map((port) => Number(port)).filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535))
  )
}

export function parseAllowedPortsFromEnv(): number[] {
  const configured = readEnv('CHERRY_LOCAL_MODEL_ALLOWED_PORTS')
  if (!configured) {
    return []
  }

  return normalizePortList(configured.split(/[\n,;]/).map((entry) => entry.trim()))
}

/** @deprecated Offline mode uses provider-configured endpoint allowlists. */
export function getAllowedHosts(): string[] {
  return []
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

export function validateLocalModelApiHost(
  rawUrl: string,
  config: OfflineNetworkRuntimeConfig = getOfflineNetworkRuntimeConfig()
): { ok: true; url: URL } | { ok: false; message: string } {
  void config

  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { ok: false, message: OFFLINE_INVALID_MODEL_API_HOST_MESSAGE }
  }

  if (!isAllowedProtocol(parsed.protocol)) {
    return { ok: false, message: OFFLINE_INVALID_MODEL_API_HOST_MESSAGE }
  }

  if (hasCredentials(parsed)) {
    return { ok: false, message: OFFLINE_INVALID_MODEL_API_HOST_MESSAGE }
  }

  if (!parsed.hostname.trim()) {
    return { ok: false, message: OFFLINE_INVALID_MODEL_API_HOST_MESSAGE }
  }

  return { ok: true, url: parsed }
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

  const endpoints = [...getProviderAllowedEndpoints(), ...getServiceAllowedEndpoints()]
  if (endpoints.length === 0) {
    throw new OfflineNetworkBlockedError(OFFLINE_ENDPOINT_NOT_CONFIGURED_MESSAGE)
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
