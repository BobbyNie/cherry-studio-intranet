import { codeTools } from '@shared/config/constant'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CodeToolsService network guards', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    delete process.env.CHERRY_NPM_REGISTRY
    delete process.env.NPM_CONFIG_REGISTRY
    delete process.env.npm_config_registry
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('skips npm network checks when no intranet registry is configured', async () => {
    vi.doMock('@shared/config/intranet', () => ({
      isPublicNetworkDisabled: vi.fn(() => true)
    }))
    vi.doMock('@main/constant', () => ({
      isMac: false,
      isWin: false
    }))

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.2.3' }),
      status: 200,
      statusText: 'OK'
    } as Response)

    const { codeToolsService } = await import('../CodeToolsService')
    vi.spyOn(codeToolsService as any, 'isPackageInstalled').mockResolvedValue(false)

    const result = await codeToolsService.getVersionInfo(codeTools.claudeCode)

    expect(result).toEqual({
      installed: null,
      latest: null,
      needsUpdate: false
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the configured intranet npm registry when provided', async () => {
    process.env.CHERRY_NPM_REGISTRY = 'http://npm.registry.internal'

    vi.doMock('@shared/config/intranet', () => ({
      isPublicNetworkDisabled: vi.fn(() => true)
    }))
    vi.doMock('@main/constant', () => ({
      isMac: false,
      isWin: false
    }))

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.2.3' }),
      status: 200,
      statusText: 'OK'
    } as Response)

    const { codeToolsService } = await import('../CodeToolsService')
    vi.spyOn(codeToolsService as any, 'isPackageInstalled').mockResolvedValue(false)

    const result = await codeToolsService.getVersionInfo(codeTools.claudeCode)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('http://npm.registry.internal/@anthropic-ai/claude-code/latest')
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    )
    expect(result.latest).toBe('1.2.3')
    expect(result.needsUpdate).toBe(false)
  })
})
