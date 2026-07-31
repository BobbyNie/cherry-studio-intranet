import type { Assistant, KnowledgeBase, Model, Provider } from '@renderer/types'
import type { ModelMessage } from 'ai'
import { describe, expect, it, vi } from 'vitest'

import {
  canRouteImageInput,
  createVisionAnalysisAssistant,
  isSelectableVisionModel,
  resolveConfiguredVisionModel,
  routeImageInput
} from '../VisionRoutingService'

const createModel = (overrides: Partial<Model> = {}): Model => ({
  id: 'gpt-4o',
  name: 'GPT-4o',
  provider: 'intranet',
  group: 'Vision',
  ...overrides
})

const primaryMessages: ModelMessage[] = [{ role: 'user', content: 'Describe the image' }]

describe('VisionRoutingService', () => {
  it('builds an isolated auxiliary assistant with every degradable capability disabled', () => {
    const primaryAssistant = {
      id: 'assistant',
      name: 'Primary',
      prompt: 'Primary system prompt',
      topics: [],
      type: 'assistant',
      model: createModel({ id: 'deepseek-chat' }),
      knowledge_bases: [{ id: 'knowledge' } as KnowledgeBase],
      enableWebSearch: true,
      webSearchProviderId: 'local-google',
      enableUrlContext: true,
      enableGenerateImage: true,
      enableMemory: true,
      mcpMode: 'auto',
      settings: {
        streamOutput: true,
        reasoning_effort: 'high',
        qwenThinkMode: true,
        customParameters: [{ name: 'thinking_budget', type: 'number', value: 4096 }]
      }
    } as Assistant
    const visionModel = createModel()

    const result = createVisionAnalysisAssistant(primaryAssistant, visionModel)

    expect(result).toMatchObject({
      model: visionModel,
      prompt: '',
      knowledge_bases: [],
      enableWebSearch: false,
      webSearchProviderId: undefined,
      enableUrlContext: false,
      enableGenerateImage: false,
      enableMemory: false,
      mcpMode: 'disabled',
      mcpServers: [],
      settings: {
        streamOutput: false,
        reasoning_effort: 'none',
        qwenThinkMode: false,
        customParameters: []
      }
    })
    expect(primaryAssistant).toMatchObject({
      model: { id: 'deepseek-chat' },
      prompt: 'Primary system prompt',
      enableWebSearch: true
    })
  })

  it('only accepts chat-capable vision models for the default vision setting', () => {
    expect(isSelectableVisionModel(createModel())).toBe(true)
    expect(isSelectableVisionModel(createModel({ id: 'deepseek-chat' }))).toBe(false)
    expect(isSelectableVisionModel(createModel({ id: 'dall-e-3' }))).toBe(false)
    expect(isSelectableVisionModel(createModel({ id: 'gemini-2.5-flash-image-preview' }))).toBe(false)
  })

  it('resolves the current model only from its enabled configured provider', () => {
    const configured = createModel({ name: 'Stale Name' })
    const current = createModel({ name: 'Current Name' })
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [current]
      } as Provider
    ]

    expect(resolveConfiguredVisionModel(configured, providers)).toBe(current)
    expect(resolveConfiguredVisionModel(configured, [{ ...providers[0], enabled: false }])).toBeUndefined()
    expect(resolveConfiguredVisionModel({ ...configured, provider: 'other' }, providers)).toBeUndefined()
  })

  it('allows non-vision assistant models to accept images only with a valid configured fallback', () => {
    const primaryModel = createModel({ id: 'deepseek-chat' })
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [primaryModel, visionModel]
      } as Provider
    ]

    expect(canRouteImageInput([primaryModel], visionModel, providers)).toBe(true)
    expect(canRouteImageInput([primaryModel], undefined, providers)).toBe(false)
    expect(canRouteImageInput([visionModel], undefined, providers)).toBe(true)
  })

  it('evaluates every model in a mixed mention request independently', () => {
    const textModel = createModel({ id: 'deepseek-chat' })
    const directVisionModel = createModel({ id: 'gpt-4.1' })
    const fallbackModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [textModel, directVisionModel, fallbackModel]
      } as Provider
    ]

    expect(canRouteImageInput([textModel, directVisionModel], fallbackModel, providers)).toBe(true)
    expect(canRouteImageInput([textModel, directVisionModel], undefined, providers)).toBe(false)
  })

  it('keeps a vision-capable primary model on the direct path', async () => {
    const analyzeImages = vi.fn()
    const loadVisionMessages = vi.fn()

    const result = await routeImageInput({
      primaryModel: createModel(),
      configuredVisionModel: createModel({ id: 'gpt-4.1' }),
      providers: [],
      containsImages: true,
      primaryMessages,
      loadVisionMessages,
      analyzeImages
    })

    expect(result).toBe(primaryMessages)
    expect(loadVisionMessages).not.toHaveBeenCalled()
    expect(analyzeImages).not.toHaveBeenCalled()
  })

  it('injects fresh untrusted visual evidence while keeping the primary messages immutable', async () => {
    const primaryModel = createModel({ id: 'deepseek-chat' })
    const configuredVisionModel = createModel({ name: 'Stale Name' })
    const currentVisionModel = createModel({ name: 'Current Name' })
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [primaryModel, currentVisionModel]
      } as Provider
    ]
    const visionMessages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'image', image: 'image-data' },
          { type: 'text', text: 'Question' }
        ]
      }
    ]
    const loadVisionMessages = vi.fn().mockResolvedValue(visionMessages)
    const analyzeImages = vi.fn().mockResolvedValue('Image 1 shows a quarterly revenue chart.')

    const result = await routeImageInput({
      primaryModel,
      configuredVisionModel,
      providers,
      containsImages: true,
      primaryMessages,
      loadVisionMessages,
      analyzeImages
    })

    expect(loadVisionMessages).toHaveBeenCalledWith(currentVisionModel)
    expect(analyzeImages).toHaveBeenCalledWith(currentVisionModel, visionMessages)
    expect(primaryMessages[0].content).toBe('Describe the image')
    expect(result[0].content).toEqual(
      expect.stringMatching(/Describe the image[\s\S]*untrusted[\s\S]*quarterly revenue chart/i)
    )
  })

  it('clones and extends an existing text part without duplicating the hidden analysis', async () => {
    const primaryModel = createModel({ id: 'deepseek-chat' })
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [primaryModel, visionModel]
      } as Provider
    ]
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Use the chart' },
          { type: 'file', data: 'file-data', mediaType: 'text/plain' }
        ]
      }
    ]

    const result = await routeImageInput({
      primaryModel,
      configuredVisionModel: visionModel,
      providers,
      containsImages: true,
      primaryMessages: messages,
      loadVisionMessages: vi.fn().mockResolvedValue(primaryMessages),
      analyzeImages: vi.fn().mockResolvedValue('Image 1 contains OCR text.')
    })

    expect(messages[0].content).toEqual([
      { type: 'text', text: 'Use the chart' },
      { type: 'file', data: 'file-data', mediaType: 'text/plain' }
    ])
    expect(result[0].content).toEqual([
      { type: 'text', text: expect.stringMatching(/Use the chart[\s\S]*Image 1 contains OCR text/) },
      { type: 'file', data: 'file-data', mediaType: 'text/plain' }
    ])
  })

  it('fails closed before calling the primary model when no valid fallback is configured', async () => {
    const analyzeImages = vi.fn()
    const loadVisionMessages = vi.fn()

    await expect(
      routeImageInput({
        primaryModel: createModel({ id: 'deepseek-chat' }),
        configuredVisionModel: undefined,
        providers: [],
        containsImages: true,
        primaryMessages,
        loadVisionMessages,
        analyzeImages
      })
    ).rejects.toMatchObject({ code: 'not_configured' })

    expect(loadVisionMessages).not.toHaveBeenCalled()
    expect(analyzeImages).not.toHaveBeenCalled()
  })

  it('fails closed when the auxiliary vision model returns no analysis', async () => {
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [visionModel]
      } as Provider
    ]

    await expect(
      routeImageInput({
        primaryModel: createModel({ id: 'deepseek-chat' }),
        configuredVisionModel: visionModel,
        providers,
        containsImages: true,
        primaryMessages,
        loadVisionMessages: vi.fn().mockResolvedValue(primaryMessages),
        analyzeImages: vi.fn().mockResolvedValue('   ')
      })
    ).rejects.toMatchObject({ code: 'analysis_failed' })
  })

  it('fails closed when no user message is available for the hidden analysis', async () => {
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [visionModel]
      } as Provider
    ]

    await expect(
      routeImageInput({
        primaryModel: createModel({ id: 'deepseek-chat' }),
        configuredVisionModel: visionModel,
        providers,
        containsImages: true,
        primaryMessages: [{ role: 'assistant', content: 'Previous answer' }],
        loadVisionMessages: vi.fn().mockResolvedValue(primaryMessages),
        analyzeImages: vi.fn().mockResolvedValue('Image 1 contains text.')
      })
    ).rejects.toMatchObject({ code: 'analysis_failed' })
  })

  it('converts auxiliary image preparation failures into a localized routing error', async () => {
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [visionModel]
      } as Provider
    ]

    await expect(
      routeImageInput({
        primaryModel: createModel({ id: 'deepseek-chat' }),
        configuredVisionModel: visionModel,
        providers,
        containsImages: true,
        primaryMessages,
        loadVisionMessages: vi.fn().mockRejectedValue(new Error('missing image file')),
        analyzeImages: vi.fn()
      })
    ).rejects.toMatchObject({ code: 'analysis_failed' })
  })

  it('preserves user-triggered abort errors from the auxiliary request', async () => {
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [visionModel]
      } as Provider
    ]
    const abortError = new DOMException('The operation was aborted', 'AbortError')

    await expect(
      routeImageInput({
        primaryModel: createModel({ id: 'deepseek-chat' }),
        configuredVisionModel: visionModel,
        providers,
        containsImages: true,
        primaryMessages,
        loadVisionMessages: vi.fn().mockResolvedValue(primaryMessages),
        analyzeImages: vi.fn().mockRejectedValue(abortError)
      })
    ).rejects.toBe(abortError)
  })

  it('re-analyzes context images on every routed request without caching the result', async () => {
    const primaryModel = createModel({ id: 'deepseek-chat' })
    const visionModel = createModel()
    const providers = [
      {
        id: 'intranet',
        name: 'Intranet',
        enabled: true,
        models: [primaryModel, visionModel]
      } as Provider
    ]
    const analyzeImages = vi.fn().mockResolvedValueOnce('First analysis').mockResolvedValueOnce('Second analysis')
    const options = {
      primaryModel,
      configuredVisionModel: visionModel,
      providers,
      containsImages: true,
      primaryMessages,
      loadVisionMessages: vi.fn().mockResolvedValue(primaryMessages),
      analyzeImages
    }

    const first = await routeImageInput(options)
    const second = await routeImageInput(options)

    expect(analyzeImages).toHaveBeenCalledTimes(2)
    expect(first).not.toEqual(second)
  })
})
