import { create } from 'zustand'
import { holidayApi } from '../api/holidayApi'

const HOLIDAY_LOCALE = 'ko'
const HOLIDAY_REGION = 'south_korea'

interface HolidayState {
  holidays: Map<string, string[]>
  loadedYears: Set<number>
  fetchHolidays: (year: number) => Promise<void>
  getHolidayNames: (dateKey: string) => string[]
}

export const useHolidayStore = create<HolidayState>((set, get) => ({
  holidays: new Map(),
  loadedYears: new Set(),

  fetchHolidays: async (year: number) => {
    if (get().loadedYears.has(year)) return
    try {
      const response = await holidayApi.getHolidays(year, HOLIDAY_LOCALE, HOLIDAY_REGION)
      const newHolidays = new Map(get().holidays)
      for (const item of response.items) {
        const dateKey = item.start.date
        const existing = newHolidays.get(dateKey) ?? []
        newHolidays.set(dateKey, [...existing, item.summary])
      }
      const newLoadedYears = new Set(get().loadedYears)
      newLoadedYears.add(year)
      set({ holidays: newHolidays, loadedYears: newLoadedYears })
    } catch (e) {
      console.warn('공휴일 로드 실패:', e)
    }
  },

  getHolidayNames: (dateKey: string) => {
    return get().holidays.get(dateKey) ?? []
  },
}))
