import { create } from 'zustand'

const STORAGE_KEY = 'custom_timezone'

interface TimezoneState {
  timezone: string
  isCustom: boolean
  setTimezone: (tz: string | null) => void
}

const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone

function loadTimezone(): { timezone: string; isCustom: boolean } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { timezone: stored, isCustom: true } : { timezone: systemTz, isCustom: false }
  } catch {
    return { timezone: systemTz, isCustom: false }
  }
}

export const useTimezoneStore = create<TimezoneState>((set) => {
  const initial = loadTimezone()
  return {
    timezone: initial.timezone,
    isCustom: initial.isCustom,
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
