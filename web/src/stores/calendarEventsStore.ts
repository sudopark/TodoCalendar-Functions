import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { groupEventsByDate, eventTimeOverlapsRange, eventTimeToStartDate, eventTimeToEndDate, formatDateKey } from '../utils/eventTimeUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  lastRange: { lower: number; upper: number } | null
  fetchEventsForRange: (lower: number, upper: number) => Promise<void>
  refreshCurrentRange: () => Promise<void>
  addEvent: (event: CalendarEvent) => void
  removeEvent: (uuid: string) => void
  replaceEvent: (uuid: string, next: CalendarEvent) => void
  reset: () => void
}

export const useCalendarEventsStore = create<CalendarEventsState>((set, get) => ({
  eventsByDate: new Map(),
  loading: false,
  lastRange: null,

  fetchEventsForRange: async (lower: number, upper: number) => {
    const { lastRange, eventsByDate } = get()
    // 같은 범위 재요청 + 캐시 있음 → 스킵
    if (lastRange && lastRange.lower === lower && lastRange.upper === upper && eventsByDate.size > 0) {
      return
    }
    set({ loading: true, lastRange: { lower, upper } })
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

  refreshCurrentRange: async () => {
    const { lastRange } = get()
    if (!lastRange) return
    // 캐시 무효화 후 재요청
    set({ lastRange: null })
    await get().fetchEventsForRange(lastRange.lower, lastRange.upper)
  },

  addEvent: (event: CalendarEvent) => {
    const { eventsByDate, lastRange } = get()
    if (!lastRange) return
    const eventTime = event.type === 'todo'
      ? (event.event.event_time ?? null)
      : event.event.event_time
    if (!eventTime) return

    if (!eventTimeOverlapsRange(eventTime, lastRange.lower, lastRange.upper)) return

    const updated = new Map(eventsByDate)
    const start = eventTimeToStartDate(eventTime)
    const end = eventTimeToEndDate(eventTime)
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cur <= endDay) {
      const key = formatDateKey(cur)
      updated.set(key, [...(updated.get(key) ?? []), event])
      cur.setDate(cur.getDate() + 1)
    }
    set({ eventsByDate: updated })
  },

  removeEvent: (uuid: string) => {
    const { eventsByDate } = get()
    const updated = new Map<string, CalendarEvent[]>()
    for (const [key, events] of eventsByDate) {
      const filtered = events.filter(e => e.event.uuid !== uuid)
      if (filtered.length > 0) updated.set(key, filtered)
    }
    set({ eventsByDate: updated })
  },

  replaceEvent: (uuid: string, next: CalendarEvent) => {
    const { eventsByDate } = get()
    const updated = new Map<string, CalendarEvent[]>()
    for (const [key, events] of eventsByDate) {
      updated.set(key, events.map(e => e.event.uuid === uuid ? next : e))
    }
    set({ eventsByDate: updated })
  },

  reset: () => set({ eventsByDate: new Map(), loading: false, lastRange: null }),
}))
