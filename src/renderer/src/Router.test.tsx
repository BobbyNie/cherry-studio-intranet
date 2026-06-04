import type * as IntranetConfig from '@shared/config/intranet'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@renderer/databases', () => ({}))

vi.mock('@shared/config/intranet', async () => {
  const actual = await vi.importActual<typeof IntranetConfig>('@shared/config/intranet')
  return {
    ...actual,
    isIntranetMode: () => true
  }
})

vi.mock('./components/app/Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('./components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>
}))
vi.mock('./components/Tab/TabContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))
vi.mock('./handler/NavigationHandler', () => ({ default: () => null }))
vi.mock('./hooks/useOnboardingState', () => ({
  useOnboardingState: () => ({ completeOnboarding: vi.fn(), onboardingCompleted: true })
}))
vi.mock('./hooks/useSettings', () => ({
  useNavbarPosition: () => ({ navbarPosition: 'top' })
}))
vi.mock('./pages/agents/AgentPage', () => ({ default: () => <div>Agents page</div> }))
vi.mock('./pages/code/CodeToolsPage', () => ({ default: () => <div>Code page</div> }))
vi.mock('./pages/files/FilesPage', () => ({ default: () => <div>Files page</div> }))
vi.mock('./pages/home/HomePage', () => ({ default: () => <div>Home page</div> }))
vi.mock('./pages/knowledge/KnowledgePage', () => ({ default: () => <div>Knowledge page</div> }))
vi.mock('./pages/launchpad/LaunchpadPage', () => ({ default: () => <div>Launchpad page</div> }))
vi.mock('./pages/minapps/MinAppPage', () => ({ default: () => <div>Min app page</div> }))
vi.mock('./pages/minapps/MinAppsPage', () => ({ default: () => <div>Min apps page</div> }))
vi.mock('./pages/notes/NotesPage', () => ({ default: () => <div>Notes page</div> }))
vi.mock('./pages/onboarding', () => ({
  OnboardingPage: () => <div>Onboarding page</div>
}))
vi.mock('./pages/openclaw/OpenClawPage', () => ({ default: () => <div>OpenClaw page</div> }))
vi.mock('./pages/paintings/PaintingsRoutePage', () => ({ default: () => <div>Paintings page</div> }))
vi.mock('./pages/settings/SettingsPage', () => ({ default: () => <div>Settings page</div> }))
vi.mock('./pages/store/assistants/presets/AssistantPresetsPage', () => ({
  default: () => <div>Store page</div>
}))
vi.mock('./pages/translate/TranslatePage', () => ({ default: () => <div>Translate page</div> }))

import Router from './Router'

describe('Router intranet routes', () => {
  beforeEach(() => {
    window.location.hash = '#/openclaw'
  })

  it('keeps the OpenClaw route mounted in intranet mode', () => {
    render(<Router />)

    expect(screen.getByText('OpenClaw page')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })
})
