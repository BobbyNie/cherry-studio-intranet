import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import {
  getDefaultLocalModelPorts,
  normalizePortList,
  setOfflineNetworkRuntimeConfig
} from '@shared/config/intranet'

const logger = loggerService.withContext('OfflineNetworkConfigService')

const CONFIG_KEYS = {
  localModelServiceEnabled: 'offlineLocalModelServiceEnabled',
  localModelApiHost: 'offlineLocalModelApiHost',
  localModelAllowedPorts: 'offlineLocalModelAllowedPorts'
} as const

export function loadOfflineNetworkConfigFromStore(): void {
  const enabled = Boolean(configManager.get<boolean>(CONFIG_KEYS.localModelServiceEnabled, false))
  const allowedPorts = normalizePortList(configManager.get<number[]>(CONFIG_KEYS.localModelAllowedPorts, []))
  setOfflineNetworkRuntimeConfig({
    localModelServiceEnabled: enabled,
    allowedPorts: allowedPorts.length > 0 ? allowedPorts : getDefaultLocalModelPorts()
  })
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
  configManager.set(CONFIG_KEYS.localModelServiceEnabled, config.localModelServiceEnabled)
  configManager.set(CONFIG_KEYS.localModelApiHost, config.localModelApiHost)
  configManager.set(CONFIG_KEYS.localModelAllowedPorts, normalizePortList(config.allowedPorts))
  setOfflineNetworkRuntimeConfig({
    localModelServiceEnabled: config.localModelServiceEnabled,
    allowedPorts: normalizePortList(config.allowedPorts)
  })
}
