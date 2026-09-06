import type { Assistant, Model, Provider } from '@renderer/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const aiProviderMocks = vi.hoisted(() => ({
  completions: vi.fn(),
  generateImage: vi.fn(),
  getEmbeddingDimensions: vi.fn()
}))
const probeOllamaModel = vi.hoisted(() => vi.fn())

vi.mock('@renderer/aiCore/services', () => ({ probeOllamaModel }))

vi.mock('../../aiCore', () => ({
  AiProvider: class {
    completions = aiProviderMocks.completions
    generateImage = aiProviderMocks.generateImage
    getEmbeddingDimensions = aiProviderMocks.getEmbeddingDimensions
  }
}))

vi.mock('../AssistantService', () => ({
  getDefaultAssistant: () => ({ id: 'assistant', name: 'Assistant' }) as Assistant,
  getDefaultModel: vi.fn(),
  getProviderByModel: vi.fn(),
  getQuickModel: vi.fn()
}))

const { checkApi } = await import('../ApiService')

describe('checkApi', () => {
  afterEach(() => vi.useRealTimers())

  beforeEach(() => {
    vi.clearAllMocks()
    aiProviderMocks.generateImage.mockResolvedValue(['data:image/png;base64,aGVsbG8='])
    probeOllamaModel.mockResolvedValue(undefined)
  })

  it('checks Ollama model availability without loading the model', async () => {
    const model = { id: 'qwen3:8b', name: 'Qwen 3', provider: 'ollama', group: 'ollama' } as Model
    const provider = {
      id: 'ollama',
      name: 'Ollama',
      type: 'ollama',
      apiKey: '',
      apiHost: 'http://localhost:11434',
      models: [model],
      isSystem: true
    } as Provider

    await checkApi(provider, model)

    expect(probeOllamaModel).toHaveBeenCalledWith(provider, model.id, expect.any(AbortSignal))
    expect(aiProviderMocks.completions).not.toHaveBeenCalled()
  })

  it.each(['timeout', 'failure', 'success'])('cleans up a custom Ollama probe after %s', async (outcome) => {
    vi.useFakeTimers()
    const model = { id: 'private-model', name: 'Private model', provider: 'corp', group: 'corp' } as Model
    const provider = {
      id: 'corp',
      name: 'Corp',
      type: 'ollama',
      apiKey: 'test-key',
      apiHost: 'https://models.corp.example',
      models: [model]
    } as Provider
    const failure = new Error('probe failed')
    if (outcome === 'timeout') {
      probeOllamaModel.mockImplementation(
        (_provider, _model, signal: AbortSignal) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
          })
      )
    } else if (outcome === 'failure') {
      probeOllamaModel.mockRejectedValue(failure)
    }
    const check = checkApi(provider, model, 100)
    if (outcome === 'timeout') {
      const rejection = expect(check).rejects.toMatchObject({ name: 'AbortError' })
      await vi.advanceTimersByTimeAsync(100)
      await rejection
    } else if (outcome === 'failure') {
      await expect(check).rejects.toBe(failure)
    } else {
      await expect(check).resolves.toBeUndefined()
    }
    expect(vi.getTimerCount()).toBe(0)
    expect(aiProviderMocks.completions).not.toHaveBeenCalled()
    expect(aiProviderMocks.generateImage).not.toHaveBeenCalled()
    expect(aiProviderMocks.getEmbeddingDimensions).not.toHaveBeenCalled()
  })
})
