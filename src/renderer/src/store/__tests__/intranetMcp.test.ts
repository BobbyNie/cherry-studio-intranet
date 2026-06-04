import { afterEach, describe, expect, it, vi } from 'vitest'

describe('intranet MCP defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

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
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_MARKETPLACE = 'true'
    vi.resetModules()

    const { builtinMCPServers } = await import('../mcp')
    const serverNames = builtinMCPServers.map((server) => server.name)

    expect(serverNames).not.toContain('@cherry/mcp-auto-install')
    expect(serverNames).not.toContain('@cherry/brave-search')
    expect(serverNames).toEqual(
      expect.arrayContaining(['@cherry/memory', '@cherry/sequentialthinking', '@cherry/filesystem'])
    )
    expect(builtinMCPServers.find((server) => server.name === '@cherry/fetch')?.isActive).toBe(false)
    expect(builtinMCPServers.find((server) => server.name === '@cherry/browser')?.isActive).toBe(false)
  })
})
