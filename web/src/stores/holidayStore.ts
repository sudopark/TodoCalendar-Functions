import { create } from 'zustand'
import { holidayApi } from '../api/holidayApi'

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
      const response = await holidayApi.getHolidays(year, 'ko', 'south_korea')
      const newHolidays = new Map(get().holidays)
      for (const item of response.items) {
        const dateKey = item.start.date
        const existing = newHolidays.get(dateKey) ?? []
        newHolidays.set(dateKey, [...existing, item.summary])
      }
      set({
        holidays: newHolidays,
        loadedYears: new Set(get().loadedYears).add(year),
      })
    } catch (e) {
      console.warn('공휴일 로드 실패:', e)
    }
  },

  getHolidayNames: (dateKey: string) => {
    return get().holidays.get(dateKey) ?? []
  },
}))
