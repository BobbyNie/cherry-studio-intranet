import { isEmbeddingModel, isRerankModel } from '@renderer/config/models'
import type { Provider } from '@renderer/types'
import { isOfflineMode } from '@shared/config/intranet'

export function isOfflineChatConfigured(providers: Provider[]): boolean {
  if (!isOfflineMode()) {
    return true
  }

  const configuredProviders = providers.filter(
    (provider) => provider.enabled && Boolean(provider.apiHost?.trim() || provider.anthropicApiHost?.trim())
  )

  return configuredProviders.some((provider) =>
    provider.models.some((model) => !isEmbeddingModel(model) && !isRerankModel(model))
  )
}
