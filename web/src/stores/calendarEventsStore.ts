import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { groupEventsByDate } from '../utils/eventTimeUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  fetchEventsForRange: (lower: number, upper: number) => Promise<void>
}

export const useCalendarEventsStore = create<CalendarEventsState>((set) => ({
  eventsByDate: new Map(),
  loading: false,

  fetchEventsForRange: async (lower: number, upper: number) => {
    set({ loading: true, eventsByDate: new Map() })
    try {
      const [todos, schedules] = await Promise.all([
        todoApi.getTodos(lower, upper),
        scheduleApi.getSchedules(lower, upper),
      ])
      const eventsByDate = groupEventsByDate(todos, schedules, lower, upper)
      set({ eventsByDate, loading: false })
    } catch (e) {
      console.warn('이벤트 로드 실패:', e)
      set({ loading: false })
    }
  },
}))
