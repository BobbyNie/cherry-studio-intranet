import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import { reduxService } from '@main/services/ReduxService'
import { setProviderAllowedEndpoints } from '@shared/config/intranet'
import { deserializeProviderEndpoints, extractProviderEndpoints } from '@shared/config/providerEndpoints'

const logger = loggerService.withContext('ProviderNetworkAllowlistService')

export const OFFLINE_PROVIDER_ENDPOINTS_KEY = 'offlineProviderAllowedEndpoints'

interface ProviderEndpointSource {
  enabled?: boolean
  apiHost?: string
  anthropicApiHost?: string
}

export function isProviderNetworkAllowlistKey(key: string): boolean {
  return key === OFFLINE_PROVIDER_ENDPOINTS_KEY
}

export function loadProviderNetworkAllowlistFromStore(): void {
  const stored = configManager.get<unknown>(OFFLINE_PROVIDER_ENDPOINTS_KEY, [])
  const endpoints = deserializeProviderEndpoints(stored)
  setProviderAllowedEndpoints(endpoints)
  logger.info('Provider network allowlist loaded from main store', { count: endpoints.length })
}

export async function syncProviderNetworkAllowlistFromRedux(): Promise<void> {
  try {
    const providers = await reduxService.select<ProviderEndpointSource[]>('state.llm.providers')
    const endpoints = extractProviderEndpoints(providers)
    setProviderAllowedEndpoints(endpoints)
    configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, endpoints)
    logger.info('Provider network allowlist synced from Redux', { count: endpoints.length })
  } catch (error) {
    logger.warn('Failed to sync provider network allowlist from Redux', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function syncProviderNetworkAllowlistFromProviders(providers: ProviderEndpointSource[]): void {
  const endpoints = extractProviderEndpoints(providers)
  setProviderAllowedEndpoints(endpoints)
  configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, endpoints)
}
