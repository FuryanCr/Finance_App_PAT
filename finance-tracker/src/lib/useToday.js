import { useEffect, useState } from 'react'
import { dayChanged, msUntilTomorrow } from './dates'

// The current date, kept fresh: it updates when the day changes while the
// app is open, and when the tab becomes visible again
export function useToday() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timer

    // only a new calendar day replaces the state, so nothing re-renders
    // otherwise
    const refresh = () => {
      const now = new Date()
      setToday((previous) => (dayChanged(previous, now) ? now : previous))
    }

    const arm = () => {
      timer = setTimeout(() => {
        refresh()
        arm()
      }, msUntilTomorrow())
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    arm()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return today
}
