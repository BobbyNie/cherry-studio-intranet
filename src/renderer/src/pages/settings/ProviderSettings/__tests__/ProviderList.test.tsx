import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProviderList from '../ProviderList'

const mocks = vi.hoisted(() => ({
  useAllProviders: vi.fn(),
  useProviders: vi.fn(),
  useTimer: vi.fn(),
  useSearchParams: vi.fn(),
  useSWRImmutable: vi.fn(),
  imageGet: vi.fn(),
  imageSet: vi.fn(),
  imageRemove: vi.fn()
}))

vi.mock('@renderer/hooks/useProvider', () => ({
  useAllProviders: () => mocks.useAllProviders(),
  useProviders: () => mocks.useProviders()
}))

vi.mock('@renderer/hooks/useTimer', () => ({
  useTimer: () => mocks.useTimer()
}))

vi.mock('swr/immutable', () => ({
  default: (...args: unknown[]) => mocks.useSWRImmutable(...args)
}))

vi.mock('@shared/config/intranet', async () => {
  const actual = await vi.importActual('@shared/config/intranet')
  return {
    ...actual,
    isIntranetMode: () => true,
    isOfflineMode: () => true
  }
})

vi.mock('react-router-dom', () => ({
  useSearchParams: () => mocks.useSearchParams()
}))

vi.mock('@renderer/components/DraggableList', async () => {
  const React = await import('react')

  const DraggableVirtualList = ({ ref, list, children }) => {
    void ref
    return React.createElement(
      'div',
      { 'data-testid': 'draggable-list' },
      ...list.map((item: any, index: number) => React.createElement('div', { key: item.id }, children(item, index)))
    )
  }

  return {
    DraggableVirtualList,
    useDraggableReorder: () => ({
      onDragEnd: vi.fn(),
      itemKey: (index: number) => `item-${index}`
    })
  }
})

vi.mock('@renderer/components/ProviderAvatar', () => ({
  ProviderAvatar: () => null
}))

vi.mock('@renderer/pages/settings/ProviderSettings/ProviderSetting', () => ({
  default: () => null
}))

vi.mock('@renderer/pages/settings/ProviderSettings/AddProviderPopup', () => ({
  default: {
    show: vi.fn()
  }
}))

vi.mock('@renderer/pages/settings/ProviderSettings/ModelNotesPopup', () => ({
  default: {
    show: vi.fn()
  }
}))

vi.mock('@renderer/pages/settings/ProviderSettings/UrlSchemaInfoPopup', () => ({
  default: {
    show: vi.fn()
  }
}))

vi.mock('@renderer/services/ImageStorage', () => ({
  default: {
    get: (...args: unknown[]) => mocks.imageGet(...args),
    set: (...args: unknown[]) => mocks.imageSet(...args),
    remove: (...args: unknown[]) => mocks.imageRemove(...args)
  }
}))

vi.mock('@renderer/components/Icons', () => ({
  DeleteIcon: () => null,
  EditIcon: () => null
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

describe('ProviderList', () => {
  beforeEach(() => {
    mocks.useAllProviders.mockReset()
    mocks.useProviders.mockReset()
    mocks.useTimer.mockReset()
    mocks.useSearchParams.mockReset()
    mocks.useSWRImmutable.mockReset()
    mocks.imageGet.mockReset()
    mocks.imageSet.mockReset()
    mocks.imageRemove.mockReset()

    mocks.useAllProviders.mockReturnValue([
      {
        id: 'internal-openai',
        name: 'Internal OpenAI',
        type: 'openai',
        apiKey: '',
        apiHost: 'http://llm-gateway.intranet.local/v1',
        models: [],
        enabled: true,
        isSystem: false
      }
    ])
    mocks.useProviders.mockReturnValue({
      addProvider: vi.fn(),
      removeProvider: vi.fn(),
      updateProvider: vi.fn(),
      updateProviders: vi.fn()
    })
    mocks.useTimer.mockReturnValue({
      setTimeoutTimer: vi.fn()
    })
    mocks.useSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()])
    mocks.useSWRImmutable.mockReturnValue({ data: true })
    mocks.imageGet.mockResolvedValue(null)
    mocks.imageSet.mockResolvedValue(undefined)
    mocks.imageRemove.mockResolvedValue(undefined)

    window.toast = {
      getToastQueue: vi.fn(),
      addToast: vi.fn(),
      closeToast: vi.fn(),
      closeAll: vi.fn(),
      isToastClosing: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn()
    } as typeof window.toast
  })

  it('keeps the add provider button visible in intranet mode', () => {
    render(<ProviderList />)

    expect(screen.getByRole('button', { name: 'button.add' })).toBeInTheDocument()
  })
})
