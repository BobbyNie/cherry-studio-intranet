import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('useOnboardingState', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    localStorage.clear()
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('keeps onboarding incomplete on first launch outside intranet mode', async () => {
    vi.resetModules()
    const { useOnboardingState } = await import('../useOnboardingState')

    const { result } = renderHook(() => useOnboardingState())

    expect(result.current.onboardingCompleted).toBe(false)
  })

  it('skips onboarding and login on first launch in intranet mode', async () => {
    process.env.CHERRY_INTRANET_MODE = 'true'
    vi.resetModules()
    const { useOnboardingState } = await import('../useOnboardingState')

    const { result } = renderHook(() => useOnboardingState())

    expect(result.current.onboardingCompleted).toBe(true)
  })

  it('persists completion when onboarding is completed manually', async () => {
    vi.resetModules()
    const { useOnboardingState } = await import('../useOnboardingState')

    const { result } = renderHook(() => useOnboardingState())

    act(() => {
      result.current.completeOnboarding()
    })

    expect(result.current.onboardingCompleted).toBe(true)
    expect(localStorage.getItem('onboarding-completed')).toBe('true')
  })
})
