import { describe, expect, it } from 'vitest'

import { SYSTEM_MODELS } from '../default'

describe('Doubao system models', () => {
  it('includes the Seed 2.1 and Evolving model metadata', () => {
    expect(SYSTEM_MODELS.doubao).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'doubao-seed-2-1-pro-260628', group: 'Doubao-Seed-2.1' }),
        expect.objectContaining({ id: 'doubao-seed-2-1-turbo-260628', group: 'Doubao-Seed-2.1' }),
        expect.objectContaining({ id: 'doubao-seed-evolving', group: 'Doubao-Seed-Evolving' })
      ])
    )
  })
})
