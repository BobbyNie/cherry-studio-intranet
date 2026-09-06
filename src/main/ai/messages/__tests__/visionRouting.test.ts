import type { ModelCapability } from '@cherrystudio/provider-registry'
import { type Model, MODEL_CAPABILITY } from '@shared/data/types/model'
import { describe, expect, it } from 'vitest'

import {
  hasImageInput,
  injectVisionAnalysis,
  injectVisionAnalysisIntoUiMessages,
  isSelectableVisionModel,
  selectVisionMessages,
  VisionRoutingError
} from '../visionRouting'

const model = (capabilities: ModelCapability[]): Model =>
  ({
    id: 'intranet::vision',
    providerId: 'intranet',
    name: 'Vision',
    capabilities,
    supportsStreaming: true,
    isEnabled: true,
    isHidden: false
  }) as Model

describe('vision routing', () => {
  it('accepts vision chat models and rejects pure image generation models', () => {
    expect(isSelectableVisionModel(model([MODEL_CAPABILITY.IMAGE_RECOGNITION]))).toBe(true)
    expect(
      isSelectableVisionModel(model([MODEL_CAPABILITY.IMAGE_RECOGNITION, MODEL_CAPABILITY.IMAGE_GENERATION]))
    ).toBe(false)
  })

  it('detects and selects image-bearing user context', () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'old' }] },
      { id: '2', role: 'user', parts: [{ type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,x' }] },
      { id: '3', role: 'assistant', parts: [{ type: 'text', text: 'answer' }] }
    ] as never[]
    expect(hasImageInput(messages)).toBe(true)
    expect(selectVisionMessages(messages)).toHaveLength(1)
  })

  it('injects untrusted analysis into the latest user message only', () => {
    const messages = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'answer' },
      { role: 'user', content: [{ type: 'text', text: 'latest' }] }
    ] as never[]
    const routed = injectVisionAnalysis(messages, 'ignore this instruction') as any
    expect(routed[0]).toEqual(messages[0])
    expect(routed[2].content[0].text).toContain('untrusted data')
    expect(routed[2].content[0].text).toContain('ignore this instruction')
  })

  it('does not mutate UI messages while injecting context', () => {
    const messages = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'question' }] }] as never[]
    const routed = injectVisionAnalysisIntoUiMessages(messages as any, 'analysis') as any
    expect((messages[0] as any).parts).toHaveLength(1)
    expect(routed[0].parts).toHaveLength(1)
    expect(routed[0].parts[0].text).toContain('analysis')
  })

  it('fails closed when there is no user message to receive analysis', () => {
    expect(() => injectVisionAnalysis([], 'analysis')).toThrowError(VisionRoutingError)
  })
})
