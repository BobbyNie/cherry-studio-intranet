/**
 * Node/CJS mirror of @shared/config/intranet assertNetworkAllowed for install scripts.
 * Reads CHERRY_OFFLINE_MODE, CHERRY_INTRANET_MODE, CHERRY_DISABLE_PUBLIC_NETWORK,
 * and CHERRY_NETWORK_ALLOWLIST from process.env (inherited from Electron main process).
 */

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const OFFLINE_NETWORK_BLOCKED_MESSAGE = '完全离线版已禁用网络访问'
const OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE = '网络白名单为空，已禁止所有网络访问'

const HOSTNAME_PATTERN =
  /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*|\d{1,3}(?:\.\d{1,3}){3})$/i

function isFlagEnabled(name) {
  const value = process.env[name] ?? process.env[`VITE_${name}`]
  return typeof value === 'string' && TRUE_VALUES.has(value.trim().toLowerCase())
}

function isPublicNetworkDisabled() {
  return isFlagEnabled('CHERRY_OFFLINE_MODE') || isFlagEnabled('CHERRY_INTRANET_MODE') || isFlagEnabled('CHERRY_DISABLE_PUBLIC_NETWORK')
}

function normalizeHostname(hostname) {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function isValidAllowlistRule(rule) {
  if (!rule || rule === '*' || rule === '*.') {
    return false
  }
  if (rule.startsWith('*.')) {
    const base = rule.slice(2)
    return Boolean(base) && HOSTNAME_PATTERN.test(base)
  }
  return HOSTNAME_PATTERN.test(rule)
}

function parseNetworkAllowlistFromEnv(raw = process.env.CHERRY_NETWORK_ALLOWLIST) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return []
  }
  const parts = raw
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean)
  const seen = new Set()
  const normalized = []
  for (const part of parts) {
    let candidate = part
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(part)) {
      try {
        const parsed = new URL(part)
        if (parsed.username || parsed.password) continue
        candidate = normalizeHostname(parsed.hostname)
      } catch {
        continue
      }
    } else {
      candidate = normalizeHostname(part.split('/')[0]?.split(':')[0] ?? '')
    }
    if (!candidate || !isValidAllowlistRule(candidate) || seen.has(candidate)) continue
    seen.add(candidate)
    normalized.push(candidate)
  }
  return normalized
}

function hostnameMatchesRule(hostname, rule) {
  if (rule.startsWith('*.')) {
    const base = rule.slice(2)
    return hostname === base || hostname.endsWith(`.${base}`)
  }
  return hostname === rule
}

function urlMatchesNetworkAllowlist(url, rules) {
  const hostname = normalizeHostname(url.hostname)
  return rules.some((rule) => hostnameMatchesRule(hostname, rule))
}

class OfflineNetworkBlockedError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OfflineNetworkBlockedError'
  }
}

function assertNetworkAllowed(url) {
  if (!isPublicNetworkDisabled()) {
    return
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  const protocol = parsed.protocol.replace(/:$/, '').toLowerCase()
  if (!['http', 'https', 'ws', 'wss'].includes(protocol)) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  if (parsed.username || parsed.password) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }

  const rules = parseNetworkAllowlistFromEnv()
  if (rules.length === 0) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_ALLOWLIST_EMPTY_MESSAGE)
  }

  if (!urlMatchesNetworkAllowlist(parsed, rules)) {
    throw new OfflineNetworkBlockedError(OFFLINE_NETWORK_BLOCKED_MESSAGE)
  }
}

module.exports = {
  assertNetworkAllowed,
  OfflineNetworkBlockedError
}
