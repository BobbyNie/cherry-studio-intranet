import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../ReduxService', () => ({
  reduxService: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}))

describe('CherryINOAuthService host validation', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('allows internal HTTPS OAuth hosts in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { default: CherryINOAuthService } = await import('../CherryINOAuthService')

    const result = await CherryINOAuthService.startOAuthFlow(
      {} as Electron.IpcMainInvokeEvent,
      'https://cherryin.intranet.local',
      'https://api.cherryin.intranet.local'
    )

    const authUrl = new URL(result.authUrl)
    expect(authUrl.origin).toBe('https://cherryin.intranet.local')
    expect(authUrl.pathname).toBe('/oauth2/auth')
    expect(authUrl.searchParams.get('state')).toBe(result.state)
  })

  it('rejects hosts with credentials before any network request', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { default: CherryINOAuthService } = await import('../CherryINOAuthService')

    await expect(
      CherryINOAuthService.startOAuthFlow(
        {} as Electron.IpcMainInvokeEvent,
        'https://user:pass@cherryin.intranet.local'
      )
    ).rejects.toThrow('Invalid API host')
  })
})
