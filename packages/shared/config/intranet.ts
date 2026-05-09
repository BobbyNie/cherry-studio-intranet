const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const INTRANET_BLOCKED_MESSAGE = (host: string) =>
  `内网版已阻止公网访问：${host}。请改用内网模型 API 或在管理员设置中加入白名单。`

export const INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE = '内网版已禁用外部链接'

const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']

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

export function isIntranetMode(): boolean {
  return isFlagEnabled('CHERRY_INTRANET_MODE')
}

export function isPublicNetworkDisabled(): boolean {
  return isIntranetMode() || isFlagEnabled('CHERRY_DISABLE_PUBLIC_NETWORK')
}

export function isAutoUpdateDisabled(): boolean {
  return isIntranetMode() || isFlagEnabled('CHERRY_DISABLE_AUTO_UPDATE')
}

export function isTelemetryDisabled(): boolean {
  return isIntranetMode() || isFlagEnabled('CHERRY_DISABLE_TELEMETRY')
}

export function isMarketplaceDisabled(): boolean {
  return isIntranetMode() || isFlagEnabled('CHERRY_DISABLE_MARKETPLACE')
}

export function areExternalLinksDisabled(): boolean {
  return isIntranetMode() || isFlagEnabled('CHERRY_DISABLE_EXTERNAL_LINKS')
}

export function getAllowedHosts(): string[] {
  const configured = [readEnv('CHERRY_NETWORK_ALLOWLIST'), readEnv('NETWORK_ALLOWLIST'), readBrowserStorageAllowlist()]
    .filter(Boolean)
    .flatMap((value) => splitAllowlist(value))

  return Array.from(new Set([...DEFAULT_ALLOWED_HOSTS, ...configured].map(normalizeAllowlistEntry).filter(Boolean)))
}

export function assertNetworkAllowed(url: string): void {
  if (!isPublicNetworkDisabled()) {
    return
  }

  const parsed = parseNetworkUrl(url)
  if (!parsed) {
    return
  }

  if (isAllowedHost(parsed)) {
    return
  }

  throw new Error(INTRANET_BLOCKED_MESSAGE(parsed.hostname))
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

function readBrowserStorageAllowlist(): string | undefined {
  try {
    return globalThis.localStorage?.getItem('cherry.networkAllowlist') ?? undefined
  } catch {
    return undefined
  }
}

function splitAllowlist(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[\n,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeAllowlistEntry(entry: string): string {
  try {
    if (entry.includes('://')) {
      const parsed = new URL(entry)
      return normalizeHostWithOptionalPort(parsed.host)
    }
  } catch {
    // Fall through to raw entry normalization.
  }

  return normalizeHostWithOptionalPort(entry)
}

function normalizeHostWithOptionalPort(value: string): string {
  return value.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function parseNetworkUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
      return null
    }
    return parsed
  } catch {
    try {
      return new URL(rawUrl, 'http://localhost')
    } catch {
      return null
    }
  }
}

function isAllowedHost(parsed: URL): boolean {
  const hostname = normalizeHostname(parsed.hostname)
  const hostWithPort = parsed.port ? `${hostname}:${parsed.port}` : hostname

  for (const entry of getAllowedHosts()) {
    if (entry === hostname || entry === hostWithPort) {
      return true
    }

    if (entry.startsWith('*.') && hostname.endsWith(entry.slice(1))) {
      return true
    }

    if (isCidrEntry(entry) && isIpInCidr(hostname, entry)) {
      return true
    }
  }

  return false
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function isCidrEntry(entry: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(entry)
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, prefixText] = cidr.split('/')
  const prefix = Number(prefixText)
  const ipNumber = ipv4ToNumber(ip)
  const rangeNumber = ipv4ToNumber(range)

  if (ipNumber === null || rangeNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipNumber & mask) === (rangeNumber & mask)
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return null
  }

  const bytes = parts.map((part) => Number(part))
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    return null
  }

  return (((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) >>> 0
}
