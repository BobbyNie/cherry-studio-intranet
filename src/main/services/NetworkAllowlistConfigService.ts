import { loggerService } from '@logger'
import {
  getNetworkAllowlistRules,
  normalizeNetworkAllowlistRules,
  setNetworkAllowlistRules
} from '@shared/config/intranet'

import { configManager } from './ConfigManager'

const logger = loggerService.withContext('NetworkAllowlistConfigService')

export const NETWORK_ALLOWLIST_CONFIG_KEY = 'intranetNetworkAllowlist'

function parseEnvAllowlist(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(/[,\n]/)
    .map((rule) => rule.trim())
    .filter(Boolean)
}

export function isNetworkAllowlistConfigKey(key: string): boolean {
  return key === NETWORK_ALLOWLIST_CONFIG_KEY
}

export function loadNetworkAllowlistFromStore(): void {
  if (configManager.has(NETWORK_ALLOWLIST_CONFIG_KEY)) {
    const rules = normalizeNetworkAllowlistRules(configManager.get<string[]>(NETWORK_ALLOWLIST_CONFIG_KEY, []))
    setNetworkAllowlistRules(rules)
    logger.info('Intranet network allowlist loaded from main store', { count: rules.length })
    return
  }

  const seededRules = normalizeNetworkAllowlistRules(parseEnvAllowlist(process.env.CHERRY_NETWORK_ALLOWLIST))
  setNetworkAllowlistRules(seededRules)

  if (seededRules.length > 0) {
    configManager.set(NETWORK_ALLOWLIST_CONFIG_KEY, getNetworkAllowlistRules())
  }

  logger.info('Intranet network allowlist seeded from environment', { count: seededRules.length })
}

export async function syncNetworkAllowlistConfigSet(
  key: string,
  value: unknown,
  isNotify: boolean = false
): Promise<boolean> {
  if (!isNetworkAllowlistConfigKey(key)) {
    return false
  }

  const rules = Array.isArray(value)
    ? value.filter((rule): rule is string => typeof rule === 'string')
    : typeof value === 'string'
      ? value.split(/\n/)
      : []
  const normalizedRules = normalizeNetworkAllowlistRules(rules)
  setNetworkAllowlistRules(normalizedRules)
  configManager.set(NETWORK_ALLOWLIST_CONFIG_KEY, normalizedRules, isNotify)
  logger.info('Intranet network allowlist updated', { count: normalizedRules.length })
  return true
}
