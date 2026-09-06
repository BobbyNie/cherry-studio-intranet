import { afterEach, describe, expect, it, vi } from 'vitest'

describe('intranet MCP defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

<<<<<<< HEAD
  it('keeps upstream built-in MCP servers available in intranet mode', async () => {
=======
  it('keeps MCP auto install and marketplace-oriented built-ins unless marketplace is explicitly disabled', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    delete process.env.CHERRY_DISABLE_MARKETPLACE
    vi.resetModules()

    const { builtinMCPServers } = await import('../mcp')
    const serverNames = builtinMCPServers.map((server) => server.name)

    expect(serverNames).toContain('@cherry/mcp-auto-install')
    expect(serverNames).toContain('@cherry/brave-search')
  })

  it('hides MCP auto install and public marketplace-oriented built-ins when marketplace is explicitly disabled', async () => {
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
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
