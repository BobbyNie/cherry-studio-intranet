import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  net: {
    fetch: vi.fn()
  },
  shell: {
    openExternal: vi.fn()
  }
}))

const fsPromisesMock = vi.hoisted(() => ({
  chmod: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn()
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    })
  }
}))

vi.mock('@main/utils/file', () => ({
  getConfigDir: () => '/tmp/cherry-studio-test-config'
}))

vi.mock('electron', () => electronMocks)

vi.mock('fs', () => ({
  promises: fsPromisesMock
}))

import { INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE } from '@shared/config/intranet'

import anthropicService from '../AnthropicService'

describe('AnthropicService intranet OAuth', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_INTRANET_MODE = 'true'
    delete process.env.CHERRY_DISABLE_EXTERNAL_LINKS
    vi.clearAllMocks()
    fsPromisesMock.readFile.mockRejectedValue(Object.assign(new Error('missing credentials'), { code: 'ENOENT' }))
    electronMocks.shell.openExternal.mockResolvedValue(undefined)
  })

  afterEach(() => {
    anthropicService.cancelOAuthFlow()
    process.env = { ...originalEnv }
  })

  it('starts OAuth in intranet mode so the central network/external-link guards decide access', async () => {
    const authUrl = await anthropicService.startOAuthFlow()

    expect(authUrl).toContain('https://claude.ai/oauth/authorize')
    expect(electronMocks.shell.openExternal).toHaveBeenCalledWith(expect.stringContaining('https://claude.ai/oauth'))
  })

  it('blocks OAuth browser launch when external links are explicitly disabled', async () => {
    process.env.CHERRY_DISABLE_EXTERNAL_LINKS = 'true'

    await expect(anthropicService.startOAuthFlow()).rejects.toThrow(INTRANET_EXTERNAL_LINK_BLOCKED_MESSAGE)
    expect(electronMocks.shell.openExternal).not.toHaveBeenCalled()
  })
})
