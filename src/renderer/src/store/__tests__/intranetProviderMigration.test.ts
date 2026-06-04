import { describe, expect, it, vi } from 'vitest'

vi.mock('@shared/utils/pdf', () => ({
  extractPdfText: vi.fn()
}))

describe('intranet provider migration', () => {
  it('removes blocked public providers and clears blocked default models in migration 207 for offline mode', async () => {
    vi.resetModules()
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'

    const { default: migrate } = await import('../migrate')

    const state = {
      _persist: { version: 206, rehydrated: false },
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
    expect(migrated.llm.defaultModel).toBeUndefined()
    expect(migrated.llm.quickModel).toBeUndefined()
    expect(migrated.llm.translateModel?.provider).toBe('intranet')
    expect(migrated.llm.topicNamingModel).toBeUndefined()
    expect(migrated.assistants.assistants[0].model).toBeUndefined()
    expect(migrated.assistants.assistants[0].defaultModel?.provider).toBe('intranet')
    expect(migrated.assistants.defaultAssistant.model).toBeUndefined()
    expect(migrated.assistants.defaultAssistant.defaultModel?.provider).toBe('ollama')
    expect(migrated.settings.sidebarIcons.visible).toContain('openclaw')
    expect(migrated.settings.sidebarIcons.disabled).toContain('openclaw')

    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_DISABLE_PUBLIC_NETWORK
  })

  it('preserves configured intranet gateway provider details in migration 210', async () => {
    vi.resetModules()
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'

    const { default: migrate } = await import('../migrate')

    const state = {
      _persist: { version: 209, rehydrated: false },
      llm: {
        providers: [
          {
            id: 'intranet',
            isSystem: true,
            enabled: true,
            apiHost: 'http://llm-gateway.intranet.local/v1',
            anthropicApiHost: 'http://llm-gateway.intranet.local/anthropic',
            models: [{ id: 'intranet-chat', provider: 'intranet' }]
          }
        ],
        defaultModel: { id: 'intranet-chat', provider: 'intranet' },
        quickModel: { id: 'intranet-chat', provider: 'intranet' },
        translateModel: { id: 'intranet-chat', provider: 'intranet' },
        topicNamingModel: { id: 'intranet-chat', provider: 'intranet' }
      },
      settings: {
        proxyMode: 'custom',
        proxyUrl: 'http://proxy.example.test:8080',
        proxyBypassRules: 'localhost',
        autoCheckUpdate: true
      },
      websearch: {
        providers: [
          {
            id: 'searxng',
            name: 'Searxng',
            apiHost: 'http://search.intranet.local'
          }
        ]
      },
      assistants: {
        assistants: [
          {
            model: { id: 'intranet-chat', provider: 'intranet' },
            defaultModel: { id: 'intranet-chat', provider: 'intranet' }
          }
        ],
        defaultAssistant: {
          model: { id: 'intranet-chat', provider: 'intranet' },
          defaultModel: { id: 'intranet-chat', provider: 'intranet' }
        }
      }
    }

    const migrated = (await migrate(state as never, 210)) as unknown as typeof state
    const intranetProvider = migrated.llm.providers[0]

    expect(intranetProvider).toMatchObject({
      id: 'intranet',
      name: '企业内网模型服务',
      enabled: true,
      apiHost: 'http://llm-gateway.intranet.local/v1',
      anthropicApiHost: 'http://llm-gateway.intranet.local/anthropic',
      models: [{ id: 'intranet-chat', provider: 'intranet' }]
    })
    expect(migrated.llm.defaultModel?.provider).toBe('intranet')
    expect(migrated.assistants.assistants[0].model?.provider).toBe('intranet')
    expect(migrated.settings.proxyMode).toBe('none')
    expect(migrated.settings.autoCheckUpdate).toBe(true)
    expect(migrated.websearch.providers).toEqual([
      {
        id: 'searxng',
        name: 'Searxng',
        apiHost: 'http://search.intranet.local'
      }
    ])

    delete process.env.CHERRY_INTRANET_MODE
    delete process.env.CHERRY_DISABLE_PUBLIC_NETWORK
  })
})
