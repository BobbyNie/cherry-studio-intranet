import { isIntranetMode } from '@shared/config/intranet'
import { useCallback, useState } from 'react'

const ONBOARDING_COMPLETED_KEY = 'onboarding-completed'

function hasCompletedOnboarding() {
  return isIntranetMode() || localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true'
}

export function useOnboardingState() {
  const [onboardingCompleted, setOnboardingCompleted] = useState(hasCompletedOnboarding)

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    setOnboardingCompleted(true)
  }, [])

  return {
    onboardingCompleted,
    completeOnboarding
  }
}
