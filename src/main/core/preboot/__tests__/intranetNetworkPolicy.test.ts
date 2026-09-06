import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const bootConfigGetMock = vi.fn()
const bootConfigSetMock = vi.fn()
const bootConfigOnChangeMock = vi.fn()

function stubBootConfig(value: string) {
  vi.doMock('@main/data/bootConfig', () => ({
    bootConfigService: {
      get: bootConfigGetMock,
      onChange: bootConfigOnChangeMock,
      set: bootConfigSetMock
    }
  }))
  bootConfigGetMock.mockReturnValue(value)
}

async function loadModule() {
  return import('../intranetNetworkPolicy')
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  bootConfigGetMock.mockReset()
  bootConfigOnChangeMock.mockReset()
  bootConfigSetMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('intranet network policy', () => {
  it('uses the persisted BootConfig allowlist as the runtime authority', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    vi.stubEnv('CHERRY_NETWORK_ALLOWLIST', 'seed.internal')
    stubBootConfig('*.corp.example')

    const { assertIntranetNetworkAllowed } = await loadModule()

    expect(() => assertIntranetNetworkAllowed('https://api.corp.example/v1')).not.toThrow()
    expect(() => assertIntranetNetworkAllowed('https://seed.internal/v1')).toThrow(/Intranet mode blocked/)
    expect(bootConfigSetMock).not.toHaveBeenCalled()
  })

  it('seeds the persisted allowlist from the environment on first launch', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    vi.stubEnv('CHERRY_NETWORK_ALLOWLIST', 'gateway.internal,*.corp.example')
    stubBootConfig('')

    const { getIntranetNetworkAllowlist } = await loadModule()

    expect(getIntranetNetworkAllowlist()).toEqual(['gateway.internal', '*.corp.example'])
    expect(bootConfigSetMock).toHaveBeenCalledWith('app.network.intranet_allowlist', 'gateway.internal\n*.corp.example')
  })

  it('fails closed when persisted rules are malformed', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    stubBootConfig('not a valid rule')

    const { getIntranetNetworkAllowlist, assertIntranetNetworkAllowed } = await loadModule()

    expect(getIntranetNetworkAllowlist()).toEqual([])
    expect(() => assertIntranetNetworkAllowed('https://gateway.internal/v1')).toThrow(/Intranet mode blocked/)
  })

  it('refreshes the active policy when settings update BootConfig', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    stubBootConfig('gateway.internal')

    const { assertIntranetNetworkAllowed } = await loadModule()
    assertIntranetNetworkAllowed('https://gateway.internal/v1')

    const listener = bootConfigOnChangeMock.mock.calls[0]?.[1]
    listener({ value: '*.corp.example' })

    expect(() => assertIntranetNetworkAllowed('https://gateway.internal/v1')).toThrow(/Intranet mode blocked/)
    expect(() => assertIntranetNetworkAllowed('https://api.corp.example/v1')).not.toThrow()
  })
})
