import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import { loadProviderNetworkAllowlistFromStore } from '@main/services/ProviderNetworkAllowlistService'
import { getDefaultLocalModelPorts, normalizePortList, setOfflineNetworkRuntimeConfig } from '@shared/config/intranet'

const logger = loggerService.withContext('OfflineNetworkConfigService')

export const OFFLINE_NETWORK_CONFIG_KEYS = {
  localModelServiceEnabled: 'offlineLocalModelServiceEnabled',
  localModelApiHost: 'offlineLocalModelApiHost',
  localModelAllowedPorts: 'offlineLocalModelAllowedPorts'
} as const

const OFFLINE_NETWORK_CONFIG_KEY_SET = new Set<string>(Object.values(OFFLINE_NETWORK_CONFIG_KEYS))

export function isOfflineNetworkConfigKey(key: string): boolean {
  return OFFLINE_NETWORK_CONFIG_KEY_SET.has(key)
}

export function loadOfflineNetworkConfigFromStore(): void {
  const enabled = Boolean(configManager.get<boolean>(OFFLINE_NETWORK_CONFIG_KEYS.localModelServiceEnabled, false))
  const allowedPorts = normalizePortList(
    configManager.get<number[]>(OFFLINE_NETWORK_CONFIG_KEYS.localModelAllowedPorts, [])
  )
  setOfflineNetworkRuntimeConfig({
    localModelServiceEnabled: enabled,
    allowedPorts: allowedPorts.length > 0 ? allowedPorts : getDefaultLocalModelPorts()
  })
  loadProviderNetworkAllowlistFromStore()
  logger.info('Offline network guard config loaded from main store', {
    enabled,
    allowedPorts: allowedPorts.length > 0 ? allowedPorts : getDefaultLocalModelPorts()
  })
}

export function saveOfflineNetworkConfigToStore(config: {
  localModelServiceEnabled: boolean
  localModelApiHost: string
  allowedPorts: number[]
}): void {
  configManager.set(OFFLINE_NETWORK_CONFIG_KEYS.localModelServiceEnabled, config.localModelServiceEnabled)
  configManager.set(OFFLINE_NETWORK_CONFIG_KEYS.localModelApiHost, config.localModelApiHost)
  configManager.set(OFFLINE_NETWORK_CONFIG_KEYS.localModelAllowedPorts, normalizePortList(config.allowedPorts))
  setOfflineNetworkRuntimeConfig({
    localModelServiceEnabled: config.localModelServiceEnabled,
    allowedPorts: normalizePortList(config.allowedPorts)
  })
  loadProviderNetworkAllowlistFromStore()
}
