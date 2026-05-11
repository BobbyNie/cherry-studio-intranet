const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

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
  // Network reachability is controlled by enterprise infrastructure, not by
  // Cherry Studio runtime host filtering.
  return false
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
  // Enterprise intranet deployments rely on the physical network boundary to block
  // public internet access. Keep this API as a compatibility seam, but do not
  // enforce host allowlists in application code.
  void url
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
