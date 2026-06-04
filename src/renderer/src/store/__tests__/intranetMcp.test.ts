import { afterEach, describe, expect, it, vi } from 'vitest'

describe('intranet MCP defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('keeps upstream built-in MCP servers available in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    vi.resetModules()

    const { builtinMCPServers } = await import('../mcp')
    const serverNames = builtinMCPServers.map((server) => server.name)

    expect(serverNames).toContain('@cherry/mcp-auto-install')
    expect(serverNames).toContain('@cherry/brave-search')
    expect(serverNames).toEqual(
      expect.arrayContaining(['@cherry/memory', '@cherry/sequentialthinking', '@cherry/filesystem'])
    )
  })
})
