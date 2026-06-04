import type * as IntranetConfig from '@shared/config/intranet'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockConfigGet = vi.fn()
const mockConfigSet = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()
const mockDispatch = vi.fn()

vi.mock('@shared/config/intranet', async () => {
  const actual = await vi.importActual<typeof IntranetConfig>('@shared/config/intranet')
  return {
    ...actual,
    isIntranetMode: () => true,
    isOfflineMode: () => false
  }
})

vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' })
}))

vi.mock('@renderer/hooks/useTimer', () => ({
  useTimer: () => ({ setTimeoutTimer: vi.fn() })
}))

vi.mock('@renderer/hooks/useSettings', () => ({
  useEnableDeveloperMode: () => ({ enableDeveloperMode: false, setEnableDeveloperMode: vi.fn() }),
  useSettings: () => ({
    language: 'en-US',
    proxyUrl: undefined,
    proxyBypassRules: undefined,
    setLaunch: vi.fn(),
    setTray: vi.fn(),
    launchOnBoot: false,
    launchToTray: false,
    trayOnClose: false,
    tray: false,
    proxyMode: 'system',
    enableDataCollection: false,
    enableSpellCheck: false,
    disableHardwareAcceleration: false,
    setDisableHardwareAcceleration: vi.fn()
  })
}))

vi.mock('@renderer/i18n', () => ({
  default: {
    changeLanguage: vi.fn(),
    getFixedT: () => (key: string) => key,
    store: { data: { en: {} } },
    t: (key: string) => key
  }
}))

vi.mock('@renderer/store', () => ({
  useAppDispatch: () => mockDispatch
}))

vi.mock('@renderer/store/assistants', () => ({
  updateAssistant: (payload: unknown) => ({ payload, type: 'assistants/updateAssistant' }),
  updateDefaultAssistant: (payload: unknown) => ({ payload, type: 'assistants/updateDefaultAssistant' })
}))

vi.mock('@renderer/store/settings', () => ({
  setEnableDataCollection: (payload: unknown) => ({ payload, type: 'settings/setEnableDataCollection' }),
  setEnableSpellCheck: (payload: unknown) => ({ payload, type: 'settings/setEnableSpellCheck' }),
  setLanguage: (payload: unknown) => ({ payload, type: 'settings/setLanguage' }),
  setNotificationSettings: (payload: unknown) => ({ payload, type: 'settings/setNotificationSettings' }),
  setProxyBypassRules: (payload: unknown) => ({ payload, type: 'settings/setProxyBypassRules' }),
  setProxyMode: (payload: unknown) => ({ payload, type: 'settings/setProxyMode' }),
  setProxyUrl: (payload: unknown) => ({ payload, type: 'settings/setProxyUrl' }),
  setSpellCheckLanguages: (payload: unknown) => ({ payload, type: 'settings/setSpellCheckLanguages' })
}))

vi.mock('@renderer/components/Selector', () => ({
  default: ({ value }: { value?: string }) => <select value={value} onChange={() => {}} />
}))

vi.mock('@renderer/components/Layout', () => ({
  HStack: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

vi.mock('@renderer/components/TooltipIcons', () => ({
  InfoTooltip: () => null
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      assistants: { defaultAssistant: { name: 'Default', topics: [] } },
      settings: {
        notification: { assistant: false, backup: false, knowledge: false },
        spellCheckLanguages: []
      }
    })
}))

import GeneralSettings from '../GeneralSettings'

describe('GeneralSettings intranet network allowlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigGet.mockResolvedValue(['gateway.comp.com', '*.comp.com'])

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        config: {
          get: mockConfigGet,
          set: mockConfigSet
        },
        setEnableSpellCheck: vi.fn(),
        setLanguage: vi.fn(),
        setSpellCheckLanguages: vi.fn()
      }
    })
    Object.defineProperty(window, 'toast', {
      configurable: true,
      value: {
        error: mockToastError,
        success: mockToastSuccess
      }
    })
  })

  it('loads and saves normalized intranet network allowlist rules', async () => {
    render(<GeneralSettings />)

    const input = await screen.findByLabelText('settings.general.intranet_network_allowlist.title')
    expect(input).toHaveValue('gateway.comp.com\n*.comp.com')

    fireEvent.change(input, { target: { value: ' Comp.COM \nhttps://Gateway.Comp.com:8443/v1\n*.comp.com' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => {
      expect(mockConfigSet).toHaveBeenCalledWith(
        'intranetNetworkAllowlist',
        ['comp.com', 'gateway.comp.com', '*.comp.com'],
        true
      )
    })
    expect(input).toHaveValue('comp.com\ngateway.comp.com\n*.comp.com')
    expect(mockToastSuccess).toHaveBeenCalledWith('common.saved')
  })

  it('rejects invalid intranet network allowlist rules before saving', async () => {
    render(<GeneralSettings />)

    const input = await screen.findByLabelText('settings.general.intranet_network_allowlist.title')
    fireEvent.change(input, { target: { value: '10.0.0.0/8' } })
    fireEvent.click(screen.getByText('common.save'))

    expect(mockConfigSet).not.toHaveBeenCalled()
    expect(mockToastError).toHaveBeenCalledWith('settings.general.intranet_network_allowlist.invalid_rule')
  })
})
