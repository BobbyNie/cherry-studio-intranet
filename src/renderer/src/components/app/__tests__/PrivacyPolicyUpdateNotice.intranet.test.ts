import { afterEach, describe, expect, it, vi } from 'vitest'

describe('PrivacyPolicyUpdateNotice intranet guards', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('treats telemetry as disabled in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    vi.resetModules()

    const { isTelemetryDisabled } = await import('@shared/config/intranet')

    expect(isTelemetryDisabled()).toBe(true)
  })
})
