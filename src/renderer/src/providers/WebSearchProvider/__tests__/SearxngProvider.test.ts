import type { WebSearchProvider } from '@renderer/types'
import axios from 'axios'
import ky from 'ky'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@agentic/searxng', () => ({
  SearxngClient: vi.fn().mockImplementation(() => ({
    search: vi.fn()
  }))
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    }))
  }
}))

vi.mock('@renderer/utils/fetch', () => ({
  fetchWebContent: vi.fn(),
  noContent: vi.fn()
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

vi.mock('ky', () => ({
  default: {
    create: vi.fn(() => ({}))
  }
}))

const { setNetworkAllowlistRules } = await import('@shared/config/intranet')
const { default: SearxngProvider } = await import('../SearxngProvider')

const originalNetworkEnv = {
  CHERRY_INTRANET_MODE: process.env.CHERRY_INTRANET_MODE,
  CHERRY_OFFLINE_MODE: process.env.CHERRY_OFFLINE_MODE,
  CHERRY_DISABLE_PUBLIC_NETWORK: process.env.CHERRY_DISABLE_PUBLIC_NETWORK
}

function clearNetworkEnv() {
  for (const key of Object.keys(originalNetworkEnv)) {
    delete process.env[key]
  }
}

function restoreNetworkEnv() {
  for (const [key, value] of Object.entries(originalNetworkEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function makeProvider(overrides: Partial<WebSearchProvider> = {}): WebSearchProvider {
  return {
    id: 'searxng',
    name: 'SearxNG',
    apiHost: 'http://search.intranet.local',
    apiKey: '',
    ...overrides
  }
}

beforeEach(() => {
  clearNetworkEnv()
  setNetworkAllowlistRules([])
  vi.stubGlobal('window', {
    ...globalThis.window,
    keyv: { get: vi.fn(), set: vi.fn() }
  })
  vi.mocked(axios.get).mockReset()
  vi.mocked(ky.create).mockClear()
})

afterEach(() => {
  restoreNetworkEnv()
  setNetworkAllowlistRules([])
  vi.unstubAllGlobals()
})

describe('SearxngProvider', () => {
  it('should initialize configured intranet hosts through axios when renderer allowlist is empty', async () => {
    process.env.CHERRY_INTRANET_MODE = '1'
    setNetworkAllowlistRules([])
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        engines: [{ enabled: true, categories: ['general', 'web'], name: 'local-engine' }]
      }
    })

    expect(() => new SearxngProvider(makeProvider())).not.toThrow()

    await vi.waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'http://search.intranet.local/config',
        expect.objectContaining({
          timeout: 5000,
          validateStatus: expect.any(Function)
        })
      )
    })
    expect(ky.create).toHaveBeenCalledTimes(1)
  })
})
