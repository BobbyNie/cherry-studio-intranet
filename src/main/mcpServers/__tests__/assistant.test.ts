import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('AssistantServer network guards', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('does not check GitHub releases in intranet mode', async () => {
    vi.doMock('electron', () => ({
      app: {
        getVersion: vi.fn(() => '1.2.3')
      }
    }))

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.2.4' }),
      status: 200,
      statusText: 'OK'
    } as Response)

    const { default: AssistantServer } = await import('../assistant')
    const server = new AssistantServer()
    const result = await (server as any).checkUpdate()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.content[0].text).toContain('disabled in intranet mode')
  })
})
