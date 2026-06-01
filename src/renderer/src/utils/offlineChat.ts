import { isEmbeddingModel, isRerankModel } from '@renderer/config/models'
import type { Provider } from '@renderer/types'
import { getOfflineNetworkRuntimeConfig, isOfflineMode } from '@shared/config/intranet'

const LOCAL_PROVIDER_IDS = new Set(['intranet', 'ollama'])

export function isOfflineChatConfigured(providers: Provider[]): boolean {
  if (!isOfflineMode()) {
    return true
  }

  const runtime = getOfflineNetworkRuntimeConfig()
  if (!runtime.localModelServiceEnabled) {
    return false
  }

  const configuredProviders = providers.filter(
    (provider) =>
      provider.enabled &&
      LOCAL_PROVIDER_IDS.has(provider.id) &&
      (provider.id === 'ollama' || Boolean(provider.apiHost?.trim()))
  )

  return configuredProviders.some((provider) =>
    provider.models.some((model) => !isEmbeddingModel(model) && !isRerankModel(model))
  )
}
