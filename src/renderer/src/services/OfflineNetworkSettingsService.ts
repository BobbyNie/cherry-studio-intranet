import type { OfflineNetworkRuntimeConfig } from '@shared/config/intranet'
import {
  getDefaultLocalModelPorts,
  getOfflineNetworkRuntimeConfig,
  normalizePortList,
  OFFLINE_INVALID_MODEL_API_HOST_MESSAGE,
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

interface ProviderShortcutConfig {
  id: string
  enabled?: boolean
  apiHost?: string
}

export interface IntranetProviderShortcutUpdate {
  id: string
  enabled: true
  apiHost: string
}

export function getPersistedOfflineSettings(): PersistedOfflineSettings {
  const runtime = getOfflineNetworkRuntimeConfig()
  return {
    localModelServiceEnabled: runtime.localModelServiceEnabled,
    allowedPorts: runtime.allowedPorts.length > 0 ? runtime.allowedPorts : getDefaultLocalModelPorts(),
    localModelApiHost: ''
  }
}

export function normalizeOfflineSettingsForSave(settings: PersistedOfflineSettings): PersistedOfflineSettings {
  const localModelApiHost = settings.localModelApiHost.trim()

  return {
    ...settings,
    localModelApiHost,
    localModelServiceEnabled: Boolean(localModelApiHost),
    allowedPorts: normalizePortList(settings.allowedPorts)
  }
}

export function createIntranetProviderShortcutUpdate(
  settings: PersistedOfflineSettings,
  providerId: string
): IntranetProviderShortcutUpdate | null {
  const normalized = normalizeOfflineSettingsForSave(settings)
  if (!normalized.localModelApiHost) {
    return null
  }

  return {
    id: providerId,
    enabled: true,
    apiHost: normalized.localModelApiHost
  }
}

export function mergeIntranetProviderShortcut<TProvider extends ProviderShortcutConfig>(
  providers: TProvider[],
  settings: PersistedOfflineSettings,
  providerId: string
): TProvider[] {
  const update = createIntranetProviderShortcutUpdate(settings, providerId)
  if (!update) {
    return providers
  }

  return providers.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          enabled: update.enabled,
          apiHost: update.apiHost
        }
      : provider
  )
}

export function applyOfflineSettings(settings: PersistedOfflineSettings): void {
  const normalized = normalizeOfflineSettingsForSave(settings)

  setOfflineNetworkRuntimeConfig({
    localModelServiceEnabled: normalized.localModelServiceEnabled,
    allowedPorts: normalized.allowedPorts
  })

  if (typeof window !== 'undefined' && window.api?.config) {
    void window.api.config.set(CONFIG_KEYS.localModelServiceEnabled, normalized.localModelServiceEnabled)
    void window.api.config.set(CONFIG_KEYS.localModelApiHost, normalized.localModelApiHost)
    void window.api.config.set(CONFIG_KEYS.localModelAllowedPorts, normalized.allowedPorts)
  }
}

export function validateOfflineSettings(settings: PersistedOfflineSettings): string | null {
  const normalized = normalizeOfflineSettingsForSave(settings)

  if (!normalized.localModelApiHost) {
    return null
  }

  const validation = validateLocalModelApiHost(normalized.localModelApiHost, {
    localModelServiceEnabled: true,
    allowedPorts: normalized.allowedPorts
  })

  if (!validation.ok) {
    return validation.message === OFFLINE_INVALID_MODEL_API_HOST_MESSAGE
      ? 'offline.settings.validation.invalid_host'
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
