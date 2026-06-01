import { getIcon } from '@iconify/react'
import { describe, expect, it } from 'vitest'

import { registerIconifyCollections } from '../registerIconifyCollections'

describe('registerIconifyCollections', () => {
  it('registers material icon theme icons locally', () => {
    registerIconifyCollections()

    expect(getIcon('material-icon-theme:markdown')).toBeTruthy()
  })
})
