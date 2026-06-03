import { net } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getIpCountry } from '../ipService'

describe('ipService', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('does not call public ipinfo service when public network is disabled', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'

    await expect(getIpCountry()).resolves.toBe('CN')
    expect(net.fetch).not.toHaveBeenCalled()
  })
})
