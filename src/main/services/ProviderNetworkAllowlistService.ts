import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import { reduxService } from '@main/services/ReduxService'
import { getNetworkAllowlistRules, setNetworkAllowlistRules } from '@shared/config/intranet'
import {
  deserializeProviderEndpoints,
  extractProviderEndpoints,
  type ProviderEndpoint
} from '@shared/config/providerEndpoints'

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

function endpointsToAllowlistRules(endpoints: ProviderEndpoint[]): string[] {
  return endpoints.map((endpoint) => endpoint.hostname)
}

function storedValueToAllowlistRules(stored: unknown): string[] {
  if (!Array.isArray(stored)) {
    return []
  }

  if (stored.every((item) => typeof item === 'string')) {
    return stored as string[]
  }

  return endpointsToAllowlistRules(deserializeProviderEndpoints(stored))
}

export function loadProviderNetworkAllowlistFromStore(): void {
  const stored = configManager.get<unknown>(OFFLINE_PROVIDER_ENDPOINTS_KEY, [])
  const rules = storedValueToAllowlistRules(stored)
  setNetworkAllowlistRules(rules)
  logger.info('Provider network allowlist loaded from main store', { count: rules.length })
}

export async function syncProviderNetworkAllowlistFromRedux(): Promise<boolean> {
  try {
    const providers = await reduxService.select<ProviderEndpointSource[]>('state.llm.providers')
    const rules = endpointsToAllowlistRules(extractProviderEndpoints(providers))
    setNetworkAllowlistRules(rules)
    configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, rules)
    logger.info('Provider network allowlist synced from Redux', { count: rules.length })
    return true
  } catch (error) {
    setNetworkAllowlistRules([])
    configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, [])
    logger.warn('Failed to sync provider network allowlist from Redux', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

export async function syncProviderNetworkAllowlistConfigSet(key: string): Promise<boolean> {
  if (!isProviderNetworkAllowlistKey(key)) {
    return false
  }

  await syncProviderNetworkAllowlistFromRedux()
  return true
}

export function syncProviderNetworkAllowlistFromProviders(providers: ProviderEndpointSource[]): void {
  const rules = endpointsToAllowlistRules(extractProviderEndpoints(providers))
  setNetworkAllowlistRules(rules)
  configManager.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, rules)
}

export function getProviderNetworkAllowlistRules(): string[] {
  return getNetworkAllowlistRules()
}
