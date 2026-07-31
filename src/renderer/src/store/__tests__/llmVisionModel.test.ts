import type { Model } from '@renderer/types'
import { describe, expect, it } from 'vitest'

import llmReducer, { initialState, setDefaultVisionModel } from '../llm'

describe('default vision model settings', () => {
  it('stores the explicitly selected vision model', () => {
    const model: Model = {
      id: 'vision-model',
      name: 'Vision Model',
      provider: 'intranet',
      group: 'Vision'
    }

    const state = llmReducer(initialState, setDefaultVisionModel({ model }))

    expect(state.defaultVisionModel).toEqual(model)
  })

  it('clears the selected vision model without affecting the primary model', () => {
    const visionModel: Model = {
      id: 'vision-model',
      name: 'Vision Model',
      provider: 'intranet',
      group: 'Vision'
    }
    const configuredState = { ...initialState, defaultVisionModel: visionModel }

    const state = llmReducer(configuredState, setDefaultVisionModel({ model: undefined }))

    expect(state.defaultVisionModel).toBeUndefined()
    expect(state.defaultModel).toEqual(initialState.defaultModel)
  })

  it('accepts persisted legacy state that does not contain the optional setting', () => {
    const legacyState = { ...initialState }
    delete legacyState.defaultVisionModel

    const state = llmReducer(legacyState, { type: 'persist/REHYDRATE' })

    expect(state.defaultVisionModel).toBeUndefined()
    expect(state.defaultModel).toEqual(initialState.defaultModel)
  })
})
