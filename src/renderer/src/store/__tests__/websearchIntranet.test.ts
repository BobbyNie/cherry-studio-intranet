import { afterEach, describe, expect, it, vi } from 'vitest'

describe('websearch intranet defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('uses the upstream default provider in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    vi.resetModules()

    const { initialState } = await import('../websearch')

    expect(initialState.defaultProvider).toBe('local-bing')
    expect(initialState.providers.map((provider) => provider.id)).toContain('local-bing')
  })
})
