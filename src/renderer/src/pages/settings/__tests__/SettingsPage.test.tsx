import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import SettingsPage from '../SettingsPage'

vi.mock('@shared/config/intranet', async () => {
  const actual = await vi.importActual('@shared/config/intranet')
  return {
    ...actual,
    isOfflineMode: () => true,
    isIntranetMode: () => true
  }
})

vi.mock('@renderer/components/app/Navbar', () => ({
  Navbar: ({ children }: { children: any }) => <div>{children}</div>,
  NavbarCenter: ({ children }: { children: any }) => <div>{children}</div>
}))

vi.mock('../ProviderSettings', () => ({
  ProviderList: () => null
}))

vi.mock('../ModelSettings/ModelSettings', () => ({
  default: () => null
}))

vi.mock('../OfflineSettings', () => ({
  default: () => <div data-testid="offline-settings" />
}))

vi.mock('../AboutSettings', () => ({
  default: () => null
}))

vi.mock('../ChannelsSettings', () => ({
  default: () => null
}))

vi.mock('../DataSettings/DataSettings', () => ({
  default: () => null
}))

vi.mock('../DisplaySettings/DisplaySettings', () => ({
  default: () => null
}))

vi.mock('../DocProcessSettings', () => ({
  default: () => null
}))

vi.mock('../GeneralSettings', () => ({
  default: () => null
}))

vi.mock('../MCPSettings', () => ({
  default: () => null
}))

vi.mock('../MemorySettings', () => ({
  default: () => null
}))

vi.mock('../QuickAssistantSettings', () => ({
  default: () => null
}))

vi.mock('../QuickPhraseSettings', () => ({
  default: () => null
}))

vi.mock('../SelectionAssistantSettings/SelectionAssistantSettings', () => ({
  default: () => null
}))

vi.mock('../ShortcutSettings', () => ({
  default: () => null
}))

vi.mock('../SkillsSettings', () => ({
  default: () => null
}))

vi.mock('../TasksSettings', () => ({
  default: () => null
}))

vi.mock('../ToolSettings/ApiServerSettings', () => ({
  ApiServerSettings: () => null
}))

vi.mock('../WebSearchSettings', () => ({
  default: () => null
}))

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key
    })
  }
})

describe('SettingsPage', () => {
  it('removes the offline settings entry and route from the intranet sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/settings/offline']}>
        <SettingsPage />
      </MemoryRouter>
    )

    expect(screen.queryByText('offline.settings.menu')).not.toBeInTheDocument()
    expect(screen.queryByTestId('offline-settings')).not.toBeInTheDocument()
    expect(screen.getByText('settings.provider.title')).toBeInTheDocument()
  })
})
