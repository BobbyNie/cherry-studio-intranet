import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@renderer/components/DividerWithText', () => ({
  default: ({ text }: { text: ReactNode }) => <div>{text}</div>
}))

vi.mock('@renderer/components/Icons', () => ({
  McpLogo: () => <span aria-hidden="true" />
}))

vi.mock('@renderer/components/ListItem', () => ({
  default: ({ active, onClick, title }: { active?: boolean; onClick?: () => void; title: ReactNode }) => (
    <button aria-pressed={active} onClick={onClick} type="button">
      {title}
    </button>
  )
}))

vi.mock('@renderer/components/Scrollbar', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' })
}))

vi.mock('@renderer/hooks/useMCPServers', () => ({
  useMCPServers: () => ({ mcpServers: [] })
}))

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, fallback: string) => fallback
    })
  }
})

vi.mock('../BuiltinMCPServerList', () => ({ default: () => <div>Built-in servers</div> }))
vi.mock('../InstallNpxUv', () => ({ default: () => <div>Install NPX</div> }))
vi.mock('../McpMarketList', () => ({ default: () => <div>Marketplace list</div> }))
vi.mock('../McpProviderSettings', () => ({ default: () => <div>Provider detail</div> }))
vi.mock('../McpServersList', () => ({ default: () => <div>MCP servers</div> }))
vi.mock('../McpSettings', () => ({ default: () => <div>MCP settings</div> }))
vi.mock('../NpxSearch', () => ({ default: () => <div>NPX search</div> }))
vi.mock('../providers/config', () => ({
  getProviderDisplayName: (provider: { key: string }) => provider.key,
  providers: [{ key: 'modelscope' }, { key: 'mcprouter' }]
}))

import MCPSettings from '../index'

function renderMCPSettings() {
  render(
    <MemoryRouter initialEntries={['/settings/mcp/marketplaces']}>
      <Routes>
        <Route path="/settings/mcp/*" element={<MCPSettings />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MCPSettings marketplace visibility', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_INTRANET_MODE = 'true'
    delete process.env.CHERRY_DISABLE_MARKETPLACE
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('keeps marketplace and providers visible in intranet mode', () => {
    renderMCPSettings()

    expect(screen.getByRole('button', { name: 'Marketplaces' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'modelscope' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'mcprouter' })).toBeInTheDocument()
  })

  it('hides marketplace and providers when explicitly disabled', () => {
    process.env.CHERRY_DISABLE_MARKETPLACE = 'true'

    renderMCPSettings()

    expect(screen.queryByRole('button', { name: 'Marketplaces' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'modelscope' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'mcprouter' })).not.toBeInTheDocument()
  })
})
