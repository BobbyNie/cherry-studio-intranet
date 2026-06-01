import type { OfflineNetworkRuntimeConfig } from '@shared/config/intranet'
import {
  getDefaultLocalModelPorts,
  getOfflineNetworkRuntimeConfig,
  normalizePortList,
  setOfflineNetworkRuntimeConfig,
  validateLocalModelApiHost
} from '@shared/config/intranet'

const CONFIG_KEYS = {
  localModelServiceEnabled: 'offlineLocalModelServiceEnabled',
  localModelApiHost: 'offlineLocalModelApiHost',
  localModelAllowedPorts: 'offlineLocalModelAllowedPorts'
} as const

export interface PersistedOfflineSettings extends OfflineNetworkRuntimeConfig {
  localModelApiHost: string
}

export function getPersistedOfflineSettings(): PersistedOfflineSettings {
  const runtime = getOfflineNetworkRuntimeConfig()
  return {
    localModelServiceEnabled: runtime.localModelServiceEnabled,
    allowedPorts: runtime.allowedPorts.length > 0 ? runtime.allowedPorts : getDefaultLocalModelPorts(),
    localModelApiHost: ''
  }
}

export function applyOfflineSettings(settings: PersistedOfflineSettings): void {
  setOfflineNetworkRuntimeConfig({
    localModelServiceEnabled: settings.localModelServiceEnabled,
    allowedPorts: normalizePortList(settings.allowedPorts)
  })

  if (typeof window !== 'undefined' && window.api?.config) {
    void window.api.config.set(CONFIG_KEYS.localModelServiceEnabled, settings.localModelServiceEnabled)
    void window.api.config.set(CONFIG_KEYS.localModelApiHost, settings.localModelApiHost)
    void window.api.config.set(CONFIG_KEYS.localModelAllowedPorts, normalizePortList(settings.allowedPorts))
  }
}

export function validateOfflineSettings(settings: PersistedOfflineSettings): string | null {
  if (!settings.localModelServiceEnabled) {
    return null
  }

  if (!settings.localModelApiHost.trim()) {
    return 'offline.settings.validation.api_host_required'
  }

  const validation = validateLocalModelApiHost(settings.localModelApiHost, {
    localModelServiceEnabled: true,
    allowedPorts: normalizePortList(settings.allowedPorts)
  })

  if (!validation.ok) {
    return validation.message === '端口不在允许列表中'
      ? 'offline.settings.validation.invalid_port'
      : 'offline.settings.validation.invalid_host'
  }

  return null
}

export async function loadOfflineSettingsFromMain(): Promise<PersistedOfflineSettings | null> {
  if (typeof window === 'undefined' || !window.api?.config) {
    return null
  }

  const [enabled, apiHost, allowedPorts] = await Promise.all([
    window.api.config.get(CONFIG_KEYS.localModelServiceEnabled),
    window.api.config.get(CONFIG_KEYS.localModelApiHost),
    window.api.config.get(CONFIG_KEYS.localModelAllowedPorts)
  ])

  if (enabled === undefined && apiHost === undefined && allowedPorts === undefined) {
    return null
  }

  return {
    localModelServiceEnabled: Boolean(enabled),
    localModelApiHost: typeof apiHost === 'string' ? apiHost : '',
    allowedPorts: normalizePortList(allowedPorts)
  }
}

export const OFFLINE_CONFIG_KEYS = CONFIG_KEYS
