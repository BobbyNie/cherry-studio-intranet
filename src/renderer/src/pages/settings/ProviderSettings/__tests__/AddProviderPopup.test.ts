import { afterEach, describe, expect, it } from 'vitest'

import { getAddProviderTypeOptions } from '../AddProviderPopup'

describe('AddProviderPopup', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('hides CherryIN provider type when official CherryIN OAuth is disabled', () => {
    process.env.CHERRY_INTRANET_MODE = 'true'

    expect(getAddProviderTypeOptions().map((option) => option.label)).not.toContain('CherryIN')
  })
})
