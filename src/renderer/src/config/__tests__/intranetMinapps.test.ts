import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('intranet minapps defaults', () => {
  const originalEnv = { ...process.env }
  const originalWindow = globalThis.window

  beforeEach(() => {
    globalThis.window = {
      ...originalWindow,
      api: {
        ...originalWindow?.api,
        file: {
          read: vi.fn().mockResolvedValue('[]'),
          writeWithId: vi.fn().mockResolvedValue(undefined)
        }
      }
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
    globalThis.window = originalWindow
  })

  it('clears public default minapps in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    vi.resetModules()

    const { ORIGIN_DEFAULT_MIN_APPS, allMinApps } = await import('../minapps')

    expect(ORIGIN_DEFAULT_MIN_APPS).toEqual([])
    expect(allMinApps).toEqual([])
  })
})
