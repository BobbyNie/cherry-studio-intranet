import { syncProviderNetworkAllowlist } from '@renderer/services/ProviderNetworkAllowlistService'
import { useAppSelector } from '@renderer/store'
import { isOfflineMode } from '@shared/config/intranet'
import { useEffect } from 'react'

export function OfflineProviderNetworkSync(): null {
  const providers = useAppSelector((state) => state.llm.providers)
  const offlineMode = isOfflineMode()

  useEffect(() => {
    if (!offlineMode) {
      return
    }

    syncProviderNetworkAllowlist(providers)
  }, [offlineMode, providers])

  return null
}
