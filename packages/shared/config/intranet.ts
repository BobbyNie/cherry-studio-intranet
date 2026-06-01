const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE = '内网版已禁用外部链接'
export const OFFLINE_NETWORK_BLOCKED_MESSAGE = '完全离线版已禁用网络访问'
export const OFFLINE_LOCALHOST_BLOCKED_MESSAGE = '请先启用本机模型服务并配置允许的端口'
export const OFFLINE_INVALID_LOCAL_HOST_MESSAGE = '仅允许 localhost、127.0.0.1 或 ::1，且必须包含明确端口'
export const OFFLINE_INVALID_PORT_MESSAGE = '端口不在允许列表中'

const LOCAL_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const DEFAULT_LOCAL_MODEL_PORTS = [11434, 1234, 8080, 8000, 5000, 3000]

export interface OfflineNetworkRuntimeConfig {
  localModelServiceEnabled: boolean
  allowedPorts: number[]
}

let offlineNetworkRuntimeConfig: OfflineNetworkRuntimeConfig = {
  localModelServiceEnabled: false,
  allowedPorts: []
}

const OFFLINE_NETWORK_CONFIG_STORAGE_KEY = 'cherry.offlineNetworkConfig'

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

export function getDefaultLocalModelPorts(): number[] {
  return [...DEFAULT_LOCAL_MODEL_PORTS]
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

function persistOfflineNetworkRuntimeConfig(): void {
  try {
    globalThis.localStorage?.setItem(OFFLINE_NETWORK_CONFIG_STORAGE_KEY, JSON.stringify(offlineNetworkRuntimeConfig))
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

/** @deprecated Offline mode no longer uses host allowlists. */
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

function normalizeLoopbackHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function isLoopbackHost(hostname: string): boolean {
  return LOCAL_LOOPBACK_HOSTS.has(normalizeLoopbackHost(hostname))
}

function isPrivateOrPublicIp(hostname: string): boolean {
  const host = normalizeLoopbackHost(hostname)
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return false
  }

  const octets = host.split('.').map(Number)
  if (octets.some((octet) => octet > 255)) {
    return false
  }

  const [a, b] = octets
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 127) return true
  if (a >= 1 && a <= 223) return true
  return false
}

function hasCredentials(url: URL): boolean {
  return Boolean(url.username || url.password)
}

function resolveEffectiveAllowedPorts(config: OfflineNetworkRuntimeConfig): number[] {
  const envPorts = parseAllowedPortsFromEnv()
  if (config.allowedPorts.length > 0) {
    return config.allowedPorts
  }
  if (envPorts.length > 0) {
    return envPorts
  }
  return DEFAULT_LOCAL_MODEL_PORTS
}

export function validateLocalModelApiHost(
  rawUrl: string,
  config: OfflineNetworkRuntimeConfig = getOfflineNetworkRuntimeConfig()
): { ok: true; url: URL } | { ok: false; message: string } {
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { ok: false, message: OFFLINE_INVALID_LOCAL_HOST_MESSAGE }
  }

  if (!isAllowedProtocol(parsed.protocol)) {
    return { ok: false, message: OFFLINE_INVALID_LOCAL_HOST_MESSAGE }
  }

  if (hasCredentials(parsed)) {
    return { ok: false, message: OFFLINE_INVALID_LOCAL_HOST_MESSAGE }
  }

  if (!parsed.port) {
    return { ok: false, message: OFFLINE_INVALID_LOCAL_HOST_MESSAGE }
  }

  const hostname = normalizeLoopbackHost(parsed.hostname)
  if (!isLoopbackHost(hostname)) {
    return { ok: false, message: OFFLINE_INVALID_LOCAL_HOST_MESSAGE }
  }

  const port = Number(parsed.port)
  const allowedPorts = resolveEffectiveAllowedPorts(config)
  if (!allowedPorts.includes(port)) {
    return { ok: false, message: OFFLINE_INVALID_PORT_MESSAGE }
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

  const config = getOfflineNetworkRuntimeConfig()
  if (!config.localModelServiceEnabled) {
    throw new OfflineNetworkBlockedError(OFFLINE_LOCALHOST_BLOCKED_MESSAGE)
  }

  if (!parsed.port) {
    throw new OfflineNetworkBlockedError(OFFLINE_INVALID_LOCAL_HOST_MESSAGE)
  }

  const hostname = normalizeLoopbackHost(parsed.hostname)
  if (!isLoopbackHost(hostname)) {
    if (hostname.includes('.') || isPrivateOrPublicIp(hostname)) {
      throw new OfflineNetworkBlockedError(OFFLINE_INVALID_LOCAL_HOST_MESSAGE)
    }
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  const port = Number(parsed.port)
  const allowedPorts = resolveEffectiveAllowedPorts(config)
  if (!allowedPorts.includes(port)) {
    throw new OfflineNetworkBlockedError(OFFLINE_INVALID_PORT_MESSAGE)
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
