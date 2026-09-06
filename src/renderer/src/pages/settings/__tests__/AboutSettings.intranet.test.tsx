import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@renderer/components/IndicatorLight', () => ({ default: () => <span /> }))
vi.mock('@renderer/components/Layout', () => ({
  HStack: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))
vi.mock('@renderer/components/Popups/UpdateDialogPopup', () => ({
  default: {
    show: vi.fn()
  }
}))
vi.mock('@renderer/config/env', () => ({
  APP_NAME: 'Cherry Studio',
  AppLogo: 'app-logo.png'
}))
vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' })
}))
vi.mock('@renderer/hooks/useMinappPopup', () => ({
  useMinappPopup: () => ({ openSmartMinapp: vi.fn() })
}))
vi.mock('@renderer/hooks/useRuntime', () => ({
  useRuntime: () => ({
    update: {
      available: false,
      checking: false,
      downloaded: false,
      downloading: false,
      downloadProgress: 0,
      info: null
    }
  })
}))
vi.mock('@renderer/hooks/useSettings', () => ({
  useSettings: () => ({
    autoCheckUpdate: true,
    setAutoCheckUpdate: vi.fn(),
    setTestChannel: vi.fn(),
    setTestPlan: vi.fn(),
    testChannel: 'latest',
    testPlan: false
  })
}))
vi.mock('@renderer/i18n', () => ({
  default: {
    language: 'en-US'
  }
}))
vi.mock('@renderer/store', () => ({
  useAppDispatch: () => vi.fn()
}))
vi.mock('@renderer/store/runtime', () => ({
  setUpdateState: (payload: unknown) => payload
}))
vi.mock('@renderer/utils', () => ({
  runAsyncFunction: (fn: () => Promise<void>) => fn()
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

import AboutSettings from '../AboutSettings'

describe('AboutSettings intranet mode', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_INTRANET_MODE = 'true'
    delete process.env.CHERRY_DISABLE_AUTO_UPDATE
    delete process.env.CHERRY_DISABLE_EXTERNAL_LINKS
    window.api = {
      checkForUpdate: vi.fn(),
      devTools: { toggle: vi.fn() },
      getAppInfo: vi.fn().mockResolvedValue({
        appPath: '/tmp/cherry-studio',
        isPortable: false,
        version: '1.9.8'
      }),
      openWebsite: vi.fn()
    } as unknown as typeof window.api
    window.electron = {
      process: {
        platform: 'darwin'
      }
    } as unknown as typeof window.electron
    window.toast = {
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    } as unknown as typeof window.toast
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn()
    }))
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  it('keeps update controls and link rows visible unless explicitly disabled', async () => {
    render(<AboutSettings />)

    expect(await screen.findByRole('button', { name: 'settings.about.checkUpdate.label' })).toBeInTheDocument()
    expect(screen.getByText('docs.title')).toBeInTheDocument()
    expect(screen.getByText('settings.about.website.title')).toBeInTheDocument()
    expect(screen.getByText('settings.about.feedback.title')).toBeInTheDocument()
  })
})
