import { create } from 'zustand'

const STORAGE_KEY = 'custom_timezone'

interface TimezoneState {
  timezone: string
  isCustom: boolean
  setTimezone: (tz: string | null) => void
}

export const useTimezoneStore = create<TimezoneState>((set) => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return {
    timezone: stored ?? systemTz,
    isCustom: !!stored,
    setTimezone: (tz) => {
      if (tz) {
        localStorage.setItem(STORAGE_KEY, tz)
        set({ timezone: tz, isCustom: true })
      } else {
        localStorage.removeItem(STORAGE_KEY)
        set({ timezone: systemTz, isCustom: false })
      }
    },
  }
})
