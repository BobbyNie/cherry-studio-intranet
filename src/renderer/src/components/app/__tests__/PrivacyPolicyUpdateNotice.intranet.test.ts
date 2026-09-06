import { afterEach, describe, expect, it, vi } from 'vitest'

describe('PrivacyPolicyUpdateNotice intranet guards', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

<<<<<<< HEAD
  it('does not disable telemetry in intranet mode', async () => {
=======
  it('treats telemetry as disabled only when explicitly disabled in intranet mode', async () => {
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_TELEMETRY = 'true'
    vi.resetModules()

    const { isTelemetryDisabled } = await import('@shared/config/intranet')

    expect(isTelemetryDisabled()).toBe(false)
  })
})
