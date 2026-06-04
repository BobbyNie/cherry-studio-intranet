import { afterEach, describe, expect, it, vi } from 'vitest'

describe('sidebar intranet defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('keeps OpenClaw visible in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    vi.resetModules()

    const { DEFAULT_SIDEBAR_ICONS, filterSidebarIconsForCurrentMode } = await import('../sidebar')

    expect(DEFAULT_SIDEBAR_ICONS).toContain('openclaw')
    expect(filterSidebarIconsForCurrentMode(['assistants', 'openclaw'])).toEqual(['assistants', 'openclaw'])
  })
})
