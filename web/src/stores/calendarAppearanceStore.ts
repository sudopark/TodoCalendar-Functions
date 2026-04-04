import { create } from 'zustand'

const STORAGE_KEY = 'calendar_appearance'

interface CalendarAppearance {
  rowHeight: number      // px, default 70
  fontSize: number       // px, default 13
  showEventNames: boolean // show event names on bars, default true
}

const DEFAULTS: CalendarAppearance = { rowHeight: 70, fontSize: 13, showEventNames: true }

function load(): CalendarAppearance {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
  } catch { return DEFAULTS }
}

interface CalendarAppearanceState extends CalendarAppearance {
  setAppearance: (updates: Partial<CalendarAppearance>) => void
  resetToDefaults: () => void
}

export const useCalendarAppearanceStore = create<CalendarAppearanceState>((set, get) => ({
  ...load(),
  setAppearance: (updates) => {
    const next = { ...get(), ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rowHeight: next.rowHeight,
      fontSize: next.fontSize,
      showEventNames: next.showEventNames,
    }))
    set(updates)
  },
  resetToDefaults: () => {
    localStorage.removeItem(STORAGE_KEY)
    set(DEFAULTS)
  },
}))
