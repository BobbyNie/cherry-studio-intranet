import { syncProviderNetworkAllowlist } from '@renderer/services/ProviderNetworkAllowlistService'
import { useAppSelector } from '@renderer/store'
import { isOfflineMode } from '@shared/config/intranet'
import { useEffect } from 'react'

export function OfflineProviderNetworkSync(): null {
  const providers = useAppSelector((state) => state.llm.providers)
  const mcpServers = useAppSelector((state) => state.mcp.servers)
  const offlineMode = isOfflineMode()

  useEffect(() => {
    if (!offlineMode) {
      return
    }

    syncProviderNetworkAllowlist(providers, mcpServers)
  }, [mcpServers, offlineMode, providers])

  return null
}
