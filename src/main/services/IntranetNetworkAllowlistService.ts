import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import { parseNetworkAllowlistFromEnv, setNetworkAllowlistRules } from '@shared/config/intranet'
import { normalizeNetworkAllowlistRules } from '@shared/network/networkAllowlist'

const logger = loggerService.withContext('IntranetNetworkAllowlistService')

export const INTRANET_NETWORK_ALLOWLIST_KEY = 'intranetNetworkAllowlist'

export function isIntranetNetworkAllowlistKey(key: string): boolean {
  return key === INTRANET_NETWORK_ALLOWLIST_KEY
}

function storedValueToRules(stored: unknown): string[] {
  if (!Array.isArray(stored)) {
    return []
  }

  return normalizeNetworkAllowlistRules(stored.filter((item): item is string => typeof item === 'string'))
}

export function loadIntranetNetworkAllowlistFromStore(): void {
  if (configManager.has(INTRANET_NETWORK_ALLOWLIST_KEY)) {
    const rules = storedValueToRules(configManager.get(INTRANET_NETWORK_ALLOWLIST_KEY))
    setNetworkAllowlistRules(rules)
    logger.info('Intranet network allowlist loaded from store', { count: rules.length })
    return
  }

  const seeded = parseNetworkAllowlistFromEnv()
  setNetworkAllowlistRules(seeded)
  logger.info('Intranet network allowlist seeded from environment', { count: seeded.length })
}

export function syncIntranetNetworkAllowlistConfigSet(key: string, value: unknown): boolean {
  if (!isIntranetNetworkAllowlistKey(key)) {
    return false
  }

  const rules = storedValueToRules(value)
  setNetworkAllowlistRules(rules)
  configManager.set(INTRANET_NETWORK_ALLOWLIST_KEY, rules)
  logger.info('Intranet network allowlist updated from config', { count: rules.length })
  return true
}
