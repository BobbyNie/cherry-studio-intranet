import type { SerializedError } from '@renderer/types/error'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fetchGenerate and fetchModels
vi.mock('../ApiService', () => ({
  fetchGenerate: vi.fn(),
  fetchModels: vi.fn().mockResolvedValue([])
}))

// Mock SYSTEM_PROVIDERS_CONFIG
vi.mock('@renderer/config/providers', () => ({
  SYSTEM_PROVIDERS_CONFIG: {
    intranet: {
      id: 'intranet',
      type: 'openai',
      apiHost: 'http://127.0.0.1:11434/v1',
      models: []
    }
  }
}))

// Mock store
vi.mock('@renderer/store', () => ({
  default: {
    getState: vi.fn(() => ({
      llm: { defaultModel: null }
    })),
    dispatch: vi.fn()
  },
  useAppSelector: vi.fn()
}))

// Mock LoggerService
vi.mock('@renderer/services/LoggerService', () => ({
  loggerService: {
    withContext: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}))

vi.mock('@shared/config/intranet', () => ({
  isIntranetMode: vi.fn(() => true)
}))

import store from '@renderer/store'
import { isIntranetMode } from '@shared/config/intranet'

import { fetchGenerate, fetchModels } from '../ApiService'
import { classifyErrorByAI, diagnoseError } from '../ErrorDiagnosisService'

const mockFetchGenerate = vi.mocked(fetchGenerate)
const mockFetchModels = vi.mocked(fetchModels)
const mockGetState = vi.mocked(store.getState)
const mockIsIntranetMode = vi.mocked(isIntranetMode)

function makeError(overrides: Partial<SerializedError> = {}): SerializedError {
  return { name: 'Error', message: 'test error', stack: null, ...overrides }
}

const configuredIntranetProvider = {
  id: 'intranet',
  type: 'openai',
  apiHost: 'http://configured-llm-gateway.local/v1',
  enabled: true,
  models: []
}

const intranetProviderWithoutDiagnosisModels = {
  id: 'intranet',
  type: 'openai',
  apiHost: 'http://127.0.0.1:11434/v1',
  enabled: true,
  models: []
}

const canonicalIntranetProvider = {
  id: 'intranet',
  type: 'openai',
  apiHost: 'http://127.0.0.1:11434/v1',
  enabled: true,
  models: [{ id: 'qwen-coder', name: 'qwen-coder', provider: 'intranet', group: 'Enterprise Intranet' }]
}

describe('ErrorDiagnosisService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchGenerate.mockReset()
    mockFetchModels.mockReset()
    mockGetState.mockReturnValue({
      llm: { defaultModel: null, providers: [configuredIntranetProvider] }
    } as any)
    mockIsIntranetMode.mockReturnValue(true)
    // Default: intranet returns a free model as fallback
    mockFetchModels.mockResolvedValue([{ id: 'qwen3.5-27b', name: 'Qwen3.5-27B', provider: 'intranet' }] as any)
  })

  describe('diagnoseError', () => {
    it('returns parsed diagnosis result from AI', async () => {
      const mockResult = {
        summary: 'Auth error',
        category: 'authentication',
        explanation: 'Your API key is invalid.',
        steps: [{ text: 'Check your API key', nav: '/settings/provider' }]
      }
      mockFetchGenerate.mockResolvedValue(JSON.stringify(mockResult))

      const result = await diagnoseError(makeError(), 'en')
      expect(result.summary).toBe('Auth error')
      expect(result.category).toBe('authentication')
      expect(result.steps).toHaveLength(1)
    })

    it('strips markdown code blocks from response', async () => {
      const mockResult = {
        summary: 'Network error',
        category: 'network',
        explanation: 'Connection refused.',
        steps: [{ text: 'Check proxy' }]
      }
      mockFetchGenerate.mockResolvedValue('```json\n' + JSON.stringify(mockResult) + '\n```')

      const result = await diagnoseError(makeError(), 'en')
      expect(result.summary).toBe('Network error')
    })

    it('throws on empty response from all models', async () => {
      mockFetchGenerate.mockResolvedValue('')
      await expect(diagnoseError(makeError(), 'en')).rejects.toThrow()
    })

    it('throws on invalid JSON from all models', async () => {
      mockFetchGenerate.mockResolvedValue('not valid json')
      await expect(diagnoseError(makeError(), 'en')).rejects.toThrow()
    })

    it('throws on missing required fields', async () => {
      mockFetchGenerate.mockResolvedValue(JSON.stringify({ foo: 'bar' }))
      await expect(diagnoseError(makeError(), 'en')).rejects.toThrow('Invalid diagnosis response format')
    })

    it('uses intranet free model as primary', async () => {
      const customModel = { id: 'gpt-4', name: 'GPT-4', provider: 'openai' }
      mockGetState.mockReturnValue({
        llm: { defaultModel: customModel, providers: [configuredIntranetProvider] }
      } as any)

      const mockResult = {
        summary: 'Error',
        category: 'unknown',
        explanation: 'Something went wrong.',
        steps: []
      }
      mockFetchGenerate.mockResolvedValue(JSON.stringify(mockResult))

      await diagnoseError(makeError(), 'en')
      // First call should use intranet free model (primary), not defaultModel
      expect(mockFetchGenerate.mock.calls[0][0]).toEqual(
        expect.objectContaining({ model: expect.objectContaining({ id: 'qwen3.5-27b' }) })
      )
    })

    it('falls back to defaultModel when intranet is unavailable', async () => {
      mockFetchModels.mockResolvedValue([])
      const customModel = { id: 'gpt-4', name: 'GPT-4', provider: 'openai' }
      mockGetState.mockReturnValue({
        llm: { defaultModel: customModel, providers: [configuredIntranetProvider] }
      } as any)

      const mockResult = {
        summary: 'Error',
        category: 'unknown',
        explanation: 'Something went wrong.',
        steps: []
      }
      mockFetchGenerate.mockResolvedValue(JSON.stringify(mockResult))

      await diagnoseError(makeError(), 'en')
      expect(mockFetchGenerate.mock.calls[0][0]).toEqual(expect.objectContaining({ model: customModel }))
    })

    it('does not probe the hard-coded intranet provider outside intranet mode', async () => {
      mockIsIntranetMode.mockReturnValue(false)
      const customModel = { id: 'gpt-4', name: 'GPT-4', provider: 'openai' }
      mockGetState.mockReturnValue({
        llm: { defaultModel: customModel, providers: [configuredIntranetProvider] }
      } as any)

      const mockResult = {
        summary: 'Error',
        category: 'unknown',
        explanation: 'Something went wrong.',
        steps: []
      }
      mockFetchGenerate.mockResolvedValue(JSON.stringify(mockResult))

      await diagnoseError(makeError(), 'en')
      expect(mockFetchModels).not.toHaveBeenCalled()
      expect(mockFetchGenerate.mock.calls[0][0]).toEqual(expect.objectContaining({ model: customModel }))
    })

    it('uses only intranet when no default model', async () => {
      mockGetState.mockReturnValue({ llm: { defaultModel: null, providers: [configuredIntranetProvider] } } as any)

      const mockResult = {
        summary: 'Error',
        category: 'unknown',
        explanation: 'Something went wrong.',
        steps: []
      }
      mockFetchGenerate.mockResolvedValue(JSON.stringify(mockResult))

      await diagnoseError(makeError(), 'en')
      expect(mockFetchGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ id: 'qwen3.5-27b' })
        })
      )
    })

    it('includes context in error info', async () => {
      const mockResult = {
        summary: 'Error',
        category: 'unknown',
        explanation: 'Something went wrong.',
        steps: []
      }
      mockFetchGenerate.mockResolvedValue(JSON.stringify(mockResult))

      await diagnoseError(makeError({ statusCode: 401 }), 'zh-CN', {
        errorSource: 'chat',
        providerName: 'intranet',
        modelId: 'qwen3.5-27b'
      })

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.content).toContain('intranet')
      expect(callArgs.content).toContain('qwen3.5-27b')
      expect(callArgs.content).toContain('401')
    })

    it('defaults category to unknown when missing', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({
          summary: 'Error',
          explanation: 'Something went wrong.',
          steps: []
        })
      )

      const result = await diagnoseError(makeError(), 'en')
      expect(result.category).toBe('unknown')
    })

    it('forwards responseBody to the AI (highest-signal provider error JSON)', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'auth', explanation: 'x', steps: [] })
      )
      const providerJson = '{"error":{"type":"insufficient_quota","code":"billing_hard_limit_reached"}}'

      await diagnoseError(makeError({ statusCode: 429, responseBody: providerJson }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.content).toContain('billing_hard_limit_reached')
      expect(callArgs.prompt).toContain('quota or account balance is exhausted')
    })

    it('does not route insufficient permissions to quota context', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'unknown', explanation: 'x', steps: [] })
      )

      await diagnoseError(makeError({ message: 'insufficient permissions' }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.prompt).not.toContain('quota or account balance is exhausted')
    })

    it('does not route an unqualified MCP mention to MCP context', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'unknown', explanation: 'x', steps: [] })
      )

      await diagnoseError(makeError({ message: 'something mcp related' }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.prompt).not.toContain('MCP (Model Context Protocol) server error')
    })

    it('routes a qualified MCP error to MCP context', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'mcp', explanation: 'x', steps: [] })
      )

      await diagnoseError(makeError({ message: 'MCP server timeout' }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.prompt).toContain('MCP (Model Context Protocol) server error')
      expect(callArgs.prompt).not.toContain('Network or proxy error')
    })

    it('forwards finishReason to the AI for safety-blocked responses', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'content', explanation: 'x', steps: [] })
      )

      await diagnoseError(makeError({ name: 'AI_NoObjectGeneratedError', finishReason: 'SAFETY' as any }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.content).toContain('SAFETY')
      // Hint should explicitly steer the AI to content/safety reasoning
      expect(callArgs.prompt.toLowerCase()).toContain('safety')
    })

    it('forwards data field as serialized JSON', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'auth', explanation: 'x', steps: [] })
      )

      await diagnoseError(
        makeError({ data: { error: { code: 'invalid_api_key', message: 'Key revoked' } } as any }),
        'en'
      )

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.content).toContain('invalid_api_key')
      expect(callArgs.content).toContain('Key revoked')
    })

    it('routes HTTP 402 Payment Required to quota context in the AI prompt', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'quota', explanation: 'x', steps: [] })
      )

      await diagnoseError(makeError({ statusCode: 402, message: 'Payment Required' }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      // The 402 path must use the quota context (billing/balance language) and
      // must not pick the rate-limit context (which would tell the user to
      // "wait and retry" — wrong advice for a billing failure).
      expect(callArgs.prompt).toContain('quota or account balance is exhausted')
      expect(callArgs.prompt).toContain('provider administrator')
      expect(callArgs.prompt).not.toContain('hitting a rate limit')
      expect(callArgs.prompt).not.toContain('must top up')
    })

    it('keeps region-block guidance inside the intranet provider boundary', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'region', explanation: 'x', steps: [] })
      )

      await diagnoseError(
        makeError({
          statusCode: 403,
          message: 'Country, region, or territory not supported (unsupported_country_region_territory)'
        }),
        'en'
      )

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.prompt).toContain('enterprise network or model-service administrator')
      expect(callArgs.prompt).toContain('another configured provider')
      expect(callArgs.prompt).not.toContain('HTTP/SOCKS proxy')
    })

    it('falls back to provider/modelId on the error when context is missing', async () => {
      mockFetchGenerate.mockResolvedValue(
        JSON.stringify({ summary: 'x', category: 'auth', explanation: 'x', steps: [] })
      )

      await diagnoseError(makeError({ providerId: 'anthropic', modelId: 'claude-sonnet-4-5' as any }), 'en')

      const callArgs = mockFetchGenerate.mock.calls[0][0]
      expect(callArgs.content).toContain('anthropic')
      expect(callArgs.content).toContain('claude-sonnet-4-5')
    })
  })

  describe('classifyErrorByAI', () => {
    it('uses a configured canonical intranet host when it already has a diagnosis model', async () => {
      mockGetState.mockReturnValue({
        llm: { defaultModel: null, providers: [canonicalIntranetProvider] }
      } as any)

      mockFetchGenerate.mockResolvedValue('configured intranet summary')

      const summary = await classifyErrorByAI(makeError({ message: 'unclassified failure' }), 'en')

      expect(summary).toBe('configured intranet summary')
      expect(mockFetchModels).not.toHaveBeenCalled()
      expect(mockFetchGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ id: 'qwen-coder', provider: 'intranet' })
        })
      )
    })

    it('returns an empty summary when the intranet provider has no diagnosis-capable models', async () => {
      mockGetState.mockReturnValue({
        llm: { defaultModel: null, providers: [intranetProviderWithoutDiagnosisModels] }
      } as any)
      mockFetchModels.mockResolvedValue([])

      const summary = await classifyErrorByAI(makeError({ message: 'unclassified failure' }), 'en')

      expect(summary).toBe('')
      expect(mockFetchModels).toHaveBeenCalledWith(intranetProviderWithoutDiagnosisModels)
      expect(mockFetchGenerate).not.toHaveBeenCalled()
    })
  })
})
