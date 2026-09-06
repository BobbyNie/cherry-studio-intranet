import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const appOnMock = vi.fn()

function stubElectron() {
  vi.doMock('electron', () => ({
    __esModule: true,
    app: {
      getPath: vi.fn((key: string) => (key === 'logs' ? '/mock/logs' : '/mock/userData')),
      isPackaged: true,
      on: appOnMock,
      onChange: vi.fn(),
      setAppLogsPath: vi.fn()
    }
  }))
}

async function loadModule() {
  return import('../intranetNetworkGuard')
}

beforeEach(() => {
  vi.resetModules()
  appOnMock.mockReset()
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('installIntranetNetworkGuard', () => {
  it('does not register a web request guard when public network is enabled', async () => {
    stubElectron()

    const { installIntranetNetworkGuard } = await loadModule()
    installIntranetNetworkGuard()

    expect(appOnMock).not.toHaveBeenCalled()
  })

  it('cancels disallowed requests and allows configured intranet requests', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    vi.stubEnv('CHERRY_NETWORK_ALLOWLIST', 'gateway.internal,*.corp.example')
    stubElectron()

    const { installIntranetNetworkGuard } = await loadModule()
    installIntranetNetworkGuard()

    const webContentsCreated = appOnMock.mock.calls.find(([event]) => event === 'web-contents-created')?.[1]
    const onBeforeRequest = vi.fn()
    webContentsCreated?.({}, { session: { webRequest: { onBeforeRequest } } })

    expect(onBeforeRequest).toHaveBeenCalledWith(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      expect.any(Function)
    )

    const requestHandler = onBeforeRequest.mock.calls[0]?.[1]
    const blockedCallback = vi.fn()
    requestHandler({ url: 'https://public.example/article' }, blockedCallback)
    expect(blockedCallback).toHaveBeenCalledWith({ cancel: true })

    const allowedCallback = vi.fn()
    requestHandler({ url: 'https://api.corp.example/v1' }, allowedCallback)
    expect(allowedCallback).toHaveBeenCalledWith({ cancel: false })
  })

  it('installs at most one handler when called repeatedly', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    stubElectron()

    const { installIntranetNetworkGuard } = await loadModule()
    installIntranetNetworkGuard()
    installIntranetNetworkGuard()

    expect(appOnMock).toHaveBeenCalledTimes(1)
  })
})
