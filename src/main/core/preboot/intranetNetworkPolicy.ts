import { loggerService } from '@logger'
import { bootConfigService } from '@main/data/bootConfig'
import { assertNetworkAllowed, isPublicNetworkDisabled, parseNetworkAllowlist } from '@shared/utils/intranet'

const logger = loggerService.withContext('IntranetNetworkPolicy')
const BOOT_CONFIG_KEY = 'app.network.intranet_allowlist' as const
const BOOT_CONFIG_INITIALIZED_KEY = 'app.network.intranet_allowlist_initialized' as const

let initialized = false
let activeRules: string[] = []
let listenerRegistered = false

/**
 * Load the persisted policy once during preboot. An environment allowlist is
 * used only to seed a new profile; subsequent requests use the BootConfig
 * value so UI edits remain authoritative across all windows.
 */
export function getIntranetNetworkAllowlist(): readonly string[] {
  registerBootConfigListener()
  if (initialized) return activeRules

  initialized = true
  const persistedValue = bootConfigService.get(BOOT_CONFIG_KEY)
  const alreadyInitialized = bootConfigService.get(BOOT_CONFIG_INITIALIZED_KEY)
  if (alreadyInitialized) {
    activeRules = parsePersistedRules(persistedValue)
    return activeRules
  }
  if (persistedValue.trim()) {
    activeRules = parsePersistedRules(persistedValue)
    bootConfigService.set(BOOT_CONFIG_INITIALIZED_KEY, true)
    return activeRules
  }

  const seededRules = parseNetworkAllowlist()
  activeRules = seededRules
  if (isPublicNetworkDisabled() && seededRules.length > 0) {
    try {
      bootConfigService.set(BOOT_CONFIG_KEY, seededRules.join('\n'))
    } catch (error) {
      logger.error('Failed to persist CHERRY_NETWORK_ALLOWLIST seed', error as Error)
    }
  }
  bootConfigService.set(BOOT_CONFIG_INITIALIZED_KEY, true)
  return activeRules
}

/** Update the in-memory policy and persist the normalized rules from settings. */
export function setIntranetNetworkAllowlist(raw: string): string[] {
  registerBootConfigListener()
  const normalizedRules = parsePersistedRules(raw)
  bootConfigService.set(BOOT_CONFIG_KEY, normalizedRules.join('\n'))
  bootConfigService.set(BOOT_CONFIG_INITIALIZED_KEY, true)
  activeRules = normalizedRules
  initialized = true
  return normalizedRules
}

/** Assert a request against the current intranet policy. */
export function assertIntranetNetworkAllowed(url: string | URL): void {
  assertNetworkAllowed(url, getIntranetNetworkAllowlist())
}

function parsePersistedRules(raw: string): string[] {
  try {
    return parseNetworkAllowlist(raw)
  } catch (error) {
    logger.error('Invalid persisted intranet network allowlist; failing closed', error as Error)
    return []
  }
}

function registerBootConfigListener(): void {
  if (listenerRegistered) return
  listenerRegistered = true
  bootConfigService.onChange(BOOT_CONFIG_KEY, ({ value }) => {
    activeRules = parsePersistedRules(value)
    initialized = true
  })
  bootConfigService.onChange(BOOT_CONFIG_INITIALIZED_KEY, ({ value }) => {
    if (value) {
      activeRules = parsePersistedRules(bootConfigService.get(BOOT_CONFIG_KEY))
      initialized = true
    }
  })
}
