import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChatLocalModelEmpty from '../ChatLocalModelEmpty'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate
}))

vi.mock('@renderer/pages/agents/components/status/AgentStatusScreen', () => ({
  default: ({ actions }: { actions: any }) => actions
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

describe('ChatLocalModelEmpty', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
  })

  it('only exposes the provider settings action', () => {
    render(<ChatLocalModelEmpty />)

    expect(screen.queryByRole('button', { name: 'offline.chat.configure_local_model' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'offline.chat.configure_provider' })).toBeInTheDocument()
  })

  it('navigates to the provider settings page when requested', () => {
    render(<ChatLocalModelEmpty />)

    fireEvent.click(screen.getByRole('button', { name: 'offline.chat.configure_provider' }))

    expect(mocks.navigate).toHaveBeenCalledWith('/settings/provider?id=intranet')
  })
})
