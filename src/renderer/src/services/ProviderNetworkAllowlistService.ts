import type { Provider } from '@renderer/types'
import { setProviderAllowedEndpoints } from '@shared/config/intranet'
import { extractProviderEndpoints } from '@shared/config/providerEndpoints'

export const OFFLINE_PROVIDER_ENDPOINTS_KEY = 'offlineProviderAllowedEndpoints'

export function syncProviderNetworkAllowlist(providers: Provider[]): void {
  const endpoints = extractProviderEndpoints(providers)
  setProviderAllowedEndpoints(endpoints)

  if (typeof window !== 'undefined' && window.api?.config) {
    void window.api.config.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, endpoints)
  }
}
