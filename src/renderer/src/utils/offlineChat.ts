import { isEmbeddingModel, isRerankModel } from '@renderer/config/models'
import type { Provider } from '@renderer/types'
import { getOfflineNetworkRuntimeConfig, isOfflineMode } from '@shared/config/intranet'

export function isOfflineChatConfigured(providers: Provider[]): boolean {
  if (!isOfflineMode()) {
    return true
  }

  const runtime = getOfflineNetworkRuntimeConfig()
  if (!runtime.localModelServiceEnabled) {
    return false
  }

  const configuredProviders = providers.filter(
    (provider) => provider.enabled && Boolean(provider.apiHost?.trim() || provider.anthropicApiHost?.trim())
  )

  return configuredProviders.some((provider) =>
    provider.models.some((model) => !isEmbeddingModel(model) && !isRerankModel(model))
  )
}
