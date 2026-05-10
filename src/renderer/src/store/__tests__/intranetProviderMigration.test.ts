import { describe, expect, it, vi } from 'vitest'

describe('intranet provider migration', () => {
  it('removes blocked public providers and resets blocked default models in migration 207', async () => {
    vi.resetModules()
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'

    const { default: migrate } = await import('../migrate')

    const state = {
      llm: {
        providers: [
          { id: 'zhinao', isSystem: true, enabled: true, models: [] },
          { id: 'gitee-ai', isSystem: true, enabled: true, models: [] },
          { id: 'intranet', isSystem: true, enabled: true, models: [] },
          { id: 'ollama', isSystem: true, enabled: false, models: [] }
        ],
        defaultModel: { id: 'blocked-default', provider: 'zhinao' },
        quickModel: { id: 'blocked-quick', provider: 'gitee-ai' },
        translateModel: { id: 'ok-model', provider: 'intranet' },
        topicNamingModel: { id: 'blocked-topic', provider: 'zhinao' }
      },
      settings: {
        sidebarIcons: {
          visible: ['assistants', 'openclaw', 'minapp'],
          disabled: ['openclaw']
        }
      },
      minapps: {
        enabled: [],
        disabled: [],
        pinned: []
      },
      assistants: {
        assistants: [
          {
            model: { id: 'assistant-blocked', provider: 'zhinao' },
            defaultModel: { id: 'assistant-ok', provider: 'intranet' }
          }
        ],
        defaultAssistant: {
          model: { id: 'default-assistant-blocked', provider: 'gitee-ai' },
          defaultModel: { id: 'default-assistant-ok', provider: 'ollama' }
        }
      }
    }

    const migrated = (await migrate(state as never, 207)) as unknown as typeof state
    const providerIds = migrated.llm.providers.map((provider) => provider.id)

    expect(providerIds).toEqual(['intranet', 'ollama'])
    expect(migrated.llm.defaultModel.provider).toBe('intranet')
    expect(migrated.llm.quickModel.provider).toBe('intranet')
    expect(migrated.llm.translateModel.provider).toBe('intranet')
    expect(migrated.llm.topicNamingModel.provider).toBe('intranet')
    expect(migrated.assistants.assistants[0].model.provider).toBe('intranet')
    expect(migrated.assistants.assistants[0].defaultModel.provider).toBe('intranet')
    expect(migrated.assistants.defaultAssistant.model.provider).toBe('intranet')
    expect(migrated.assistants.defaultAssistant.defaultModel.provider).toBe('ollama')
    expect(migrated.settings.sidebarIcons.visible).not.toContain('openclaw')
    expect(migrated.settings.sidebarIcons.disabled).not.toContain('openclaw')
  })
})
