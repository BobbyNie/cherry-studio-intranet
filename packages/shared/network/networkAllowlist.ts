export type NetworkAllowlistRule = string

const HOSTNAME_PATTERN =
  /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*|\d{1,3}(?:\.\d{1,3}){3})$/i

let networkAllowlistRules: NetworkAllowlistRule[] = []

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function isValidAllowlistRule(rule: string): boolean {
  if (!rule || rule === '*' || rule === '*.') {
    return false
  }

  if (rule.startsWith('*.')) {
    const base = rule.slice(2)
    return Boolean(base) && HOSTNAME_PATTERN.test(base)
  }

  return HOSTNAME_PATTERN.test(rule)
}

function extractRuleFromInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.username || parsed.password) {
        return null
      }
      const hostname = normalizeHostname(parsed.hostname)
      return hostname || null
    } catch {
      return null
    }
  }

  const hostname = normalizeHostname(trimmed.split('/')[0]?.split(':')[0] ?? '')
  return hostname || null
}

export function normalizeNetworkAllowlistRules(rules: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const raw of rules) {
    const candidate = extractRuleFromInput(raw)
    if (!candidate || !isValidAllowlistRule(candidate)) {
      continue
    }

    if (seen.has(candidate)) {
      continue
    }

    seen.add(candidate)
    normalized.push(candidate)
  }

  return normalized
}

export function getNetworkAllowlistRules(): string[] {
  return [...networkAllowlistRules]
}

export function setNetworkAllowlistRules(rules: string[]): void {
  networkAllowlistRules = normalizeNetworkAllowlistRules(rules)
}

function hostnameMatchesRule(hostname: string, rule: string): boolean {
  if (rule.startsWith('*.')) {
    const base = rule.slice(2)
    return hostname === base || hostname.endsWith(`.${base}`)
  }

  return hostname === rule
}

export function urlMatchesNetworkAllowlist(url: URL, rules?: string[]): boolean {
  const activeRules = rules ?? networkAllowlistRules
  if (activeRules.length === 0) {
    return false
  }

  const hostname = normalizeHostname(url.hostname)
  if (!hostname) {
    return false
  }

  return activeRules.some((rule) => hostnameMatchesRule(hostname, rule))
}
