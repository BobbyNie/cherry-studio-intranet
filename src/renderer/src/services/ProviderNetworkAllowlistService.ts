import type { Provider } from '@renderer/types'
import { setNetworkAllowlistRules } from '@shared/config/intranet'
import { extractProviderEndpoints } from '@shared/config/providerEndpoints'

export const OFFLINE_PROVIDER_ENDPOINTS_KEY = 'offlineProviderAllowedEndpoints'

export function syncProviderNetworkAllowlist(providers: Provider[]): void {
  const rules = extractProviderEndpoints(providers).map((endpoint) => endpoint.hostname)
  setNetworkAllowlistRules(rules)

  if (typeof window !== 'undefined' && window.api?.config) {
    void window.api.config.set(OFFLINE_PROVIDER_ENDPOINTS_KEY, rules)
  }
}
