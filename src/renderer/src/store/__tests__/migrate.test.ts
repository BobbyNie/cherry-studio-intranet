import { describe, expect, it, vi } from 'vitest'

import migrate from '../migrate'

describe('store migrations', () => {
  it('keeps selected models belonging to retained custom providers during intranet migration 207', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    const model = { id: 'company-model', provider: 'company', name: 'Company model', group: 'company' }
    const state = {
      settings: { sidebarIcons: { visible: [], disabled: [] } },
      llm: {
        providers: [{ id: 'company', isSystem: false, apiHost: 'https://llm.corp.example/v1', models: [model] }],
        defaultModel: model,
        quickModel: model,
        translateModel: model,
        topicNamingModel: model
      },
      assistants: { assistants: [{ model, defaultModel: model }], defaultAssistant: { model, defaultModel: model } },
      _persist: { version: 206, rehydrated: false }
    }
    try {
      const migrated: any = await migrate(structuredClone(state) as any, 207)
      expect(migrated.llm).toEqual(state.llm)
      expect(migrated.assistants).toEqual(state.assistants)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  describe('migration 212: repair legacy MCP package arguments', () => {
    it('repairs valid entries after corrupt entries without changing other configuration', async () => {
      const state = {
        mcp: {
          servers: [
            null,
            { name: '@cherry/mcp-auto-install', args: 'invalid' },
            {
              name: '@cherry/mcp-auto-install',
              command: 'bun',
              args: ['x', '@cherry/mcp-auto-install'],
              isActive: false
            },
            { name: 'custom', args: ['@cherry/mcp-auto-install'] },
            { name: '@cherry/mcp-auto-install', args: ['@mcpmarket/mcp-auto-install'] }
          ]
        },
        llm: {
          providers: [
            {
              id: 'gateway',
              apiHost: 'https://llm.corp.example/v1',
              anthropicApiHost: 'https://claude.corp.example',
              models: []
            }
          ]
        },
        settings: { enableDataCollection: false },
        _persist: { version: 211, rehydrated: false }
      }
      const expected = structuredClone(state)
      expected.mcp.servers[2]!.args = ['x', '@mcpmarket/mcp-auto-install']

      const migrated: any = await migrate(structuredClone(state) as any, 212)
      expect(migrated).toEqual(expected)
      expect(await migrate(migrated, 212)).toEqual(expected)
    })

    it('preserves enterprise command, registry, credentials and disabled state', async () => {
      const server = {
        id: 'enterprise-auto-install',
        name: '@cherry/mcp-auto-install',
        command: '/opt/company/bin/npx',
        args: ['--registry', 'https://npm.corp.example', '@cherry/mcp-auto-install', 'connect', '--json'],
        env: { TOKEN: 'test-token' },
        isActive: false
      }
      const state = {
        mcp: { servers: [server] },
        _persist: { version: 211, rehydrated: false }
      }

      const migrated: any = await migrate(structuredClone(state) as any, 212)

      expect(migrated.mcp.servers).toEqual([
        {
          ...server,
          args: ['--registry', 'https://npm.corp.example', '@mcpmarket/mcp-auto-install', 'connect', '--json']
        }
      ])
    })
  })

  describe('migration 208: StepFun Anthropic-compatible host backfill', () => {
    it('backfills anthropicApiHost for existing StepFun providers', async () => {
      const state = {
        llm: {
          providers: [
            {
              id: 'stepfun',
              apiHost: 'https://api.stepfun.com'
            }
          ]
        },
        _persist: { version: 207, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 208)

      expect(migrated.llm.providers[0].anthropicApiHost).toBe('https://api.stepfun.com')
    })

    it('preserves existing StepFun anthropicApiHost customizations', async () => {
      const state = {
        llm: {
          providers: [
            {
              id: 'stepfun',
              apiHost: 'https://api.stepfun.com',
              anthropicApiHost: 'https://custom.example.com'
            }
          ]
        },
        _persist: { version: 207, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 208)

      expect(migrated.llm.providers[0].anthropicApiHost).toBe('https://custom.example.com')
    })
  })

  describe('migration 209: privacy policy data collection default', () => {
    it('enables data collection for non-intranet upgrades', async () => {
      const state = {
        settings: { enableDataCollection: false },
        _persist: { version: 208, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 209)

      expect(migrated.settings.enableDataCollection).toBe(true)
    })

    it('does not enable data collection in intranet mode', async () => {
      process.env.CHERRY_INTRANET_MODE = 'true'
      const state = {
        settings: { enableDataCollection: false },
        _persist: { version: 208, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 209)

      expect(migrated.settings.enableDataCollection).toBe(false)
      delete process.env.CHERRY_INTRANET_MODE
    })
  })
})
