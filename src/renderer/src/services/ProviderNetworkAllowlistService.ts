import type { Provider } from '@renderer/types'
import { setProviderAllowedEndpoints, setServiceAllowedEndpoints } from '@shared/config/intranet'
import { extractProviderEndpoints, extractServiceEndpoints } from '@shared/config/providerEndpoints'

export const OFFLINE_PROVIDER_ENDPOINTS_KEY = 'offlineProviderAllowedEndpoints'
export const OFFLINE_SERVICE_ENDPOINTS_KEY = 'offlineServiceAllowedEndpoints'

interface ServiceEndpointSource {
  enabled?: boolean
  isActive?: boolean
  baseUrl?: string
  registryUrl?: string
  url?: string
}

export function syncProviderNetworkAllowlist(providers: Provider[], services: ServiceEndpointSource[] = []): void {
  const providerEndpoints = extractProviderEndpoints(providers)
  const serviceEndpoints = extractServiceEndpoints(services)
  setProviderAllowedEndpoints(providerEndpoints)
  setServiceAllowedEndpoints(serviceEndpoints)

  if (typeof window !== 'undefined' && window.api?.config) {
    void window.api.config.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, providerEndpoints)
    void window.api.config.set(OFFLINE_SERVICE_ENDPOINTS_KEY, serviceEndpoints)
  }
}
