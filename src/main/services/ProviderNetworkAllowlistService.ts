import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import { reduxService } from '@main/services/ReduxService'
import { setProviderAllowedEndpoints, setServiceAllowedEndpoints } from '@shared/config/intranet'
import {
  deserializeProviderEndpoints,
  extractProviderEndpoints,
  extractServiceEndpoints
} from '@shared/config/providerEndpoints'

const logger = loggerService.withContext('ProviderNetworkAllowlistService')

export const OFFLINE_PROVIDER_ENDPOINTS_KEY = 'offlineProviderAllowedEndpoints'
export const OFFLINE_SERVICE_ENDPOINTS_KEY = 'offlineServiceAllowedEndpoints'

interface ProviderEndpointSource {
  enabled?: boolean
  apiHost?: string
  anthropicApiHost?: string
}

interface ServiceEndpointSource {
  enabled?: boolean
  isActive?: boolean
  baseUrl?: string
  registryUrl?: string
  url?: string
}

export function isProviderNetworkAllowlistKey(key: string): boolean {
  return key === OFFLINE_PROVIDER_ENDPOINTS_KEY || key === OFFLINE_SERVICE_ENDPOINTS_KEY
}

export function loadProviderNetworkAllowlistFromStore(): void {
  const storedProviderEndpoints = configManager.get<unknown>(OFFLINE_PROVIDER_ENDPOINTS_KEY, [])
  const providerEndpoints = deserializeProviderEndpoints(storedProviderEndpoints)
  setProviderAllowedEndpoints(providerEndpoints)

  const storedServiceEndpoints = configManager.get<unknown>(OFFLINE_SERVICE_ENDPOINTS_KEY, [])
  const serviceEndpoints = deserializeProviderEndpoints(storedServiceEndpoints)
  setServiceAllowedEndpoints(serviceEndpoints)

  logger.info('Network allowlist loaded from main store', {
    providerCount: providerEndpoints.length,
    serviceCount: serviceEndpoints.length
  })
}

export async function syncProviderNetworkAllowlistFromRedux(): Promise<void> {
  try {
    const providers = await reduxService.select<ProviderEndpointSource[]>('state.llm.providers')
    const mcpServers = await reduxService.select<ServiceEndpointSource[]>('state.mcp.servers')
    const providerEndpoints = extractProviderEndpoints(providers)
    const serviceEndpoints = extractServiceEndpoints(mcpServers)
    setProviderAllowedEndpoints(providerEndpoints)
    setServiceAllowedEndpoints(serviceEndpoints)
    configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, providerEndpoints)
    configManager.set(OFFLINE_SERVICE_ENDPOINTS_KEY, serviceEndpoints)
    logger.info('Network allowlist synced from Redux', {
      providerCount: providerEndpoints.length,
      serviceCount: serviceEndpoints.length
    })
  } catch (error) {
    logger.warn('Failed to sync network allowlist from Redux', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function syncProviderNetworkAllowlistFromProviders(providers: ProviderEndpointSource[]): void {
  const endpoints = extractProviderEndpoints(providers)
  setProviderAllowedEndpoints(endpoints)
  configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, endpoints)
}

export function syncServiceNetworkAllowlistFromServices(services: ServiceEndpointSource[]): void {
  const endpoints = extractServiceEndpoints(services)
  setServiceAllowedEndpoints(endpoints)
  configManager.set(OFFLINE_SERVICE_ENDPOINTS_KEY, endpoints)
}
