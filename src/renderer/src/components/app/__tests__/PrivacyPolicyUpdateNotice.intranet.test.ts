import { afterEach, describe, expect, it, vi } from 'vitest'

describe('PrivacyPolicyUpdateNotice intranet guards', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('treats telemetry as disabled only when explicitly disabled in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_TELEMETRY = 'true'
    vi.resetModules()

    const { isTelemetryDisabled } = await import('@shared/config/intranet')

    expect(isTelemetryDisabled()).toBe(true)
  })
})
