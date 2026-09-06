import { SettingsContentColumn } from '@renderer/components/SettingsPrimitives'
import McpMarketList from '@renderer/pages/settings/McpSettings/McpMarketList'
import { isMarketplaceDisabled } from '@shared/utils/intranet'
import { createFileRoute, Navigate } from '@tanstack/react-router'

const MarketplacesWrapper = () =>
  isMarketplaceDisabled() ? (
    <Navigate to="/settings/mcp/servers" replace />
  ) : (
    <SettingsContentColumn className="pt-2">
      <McpMarketList />
    </SettingsContentColumn>
  )

export const Route = createFileRoute('/settings/mcp/marketplaces')({
  component: MarketplacesWrapper
})
