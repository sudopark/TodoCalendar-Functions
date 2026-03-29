import type { EventTime, Todo, Schedule } from '../models'

export function eventTimeToStartDate(eventTime: EventTime): Date {
  switch (eventTime.time_type) {
    case 'at':
      return new Date(eventTime.timestamp * 1000)
    case 'period':
      return new Date(eventTime.period_start * 1000)
    case 'allday':
      return new Date((eventTime.period_start + eventTime.seconds_from_gmt) * 1000)
  }
}

export function eventTimeToEndDate(eventTime: EventTime): Date {
  switch (eventTime.time_type) {
    case 'at':
      return new Date(eventTime.timestamp * 1000)
    case 'period':
      return new Date(eventTime.period_end * 1000)
    case 'allday':
      return new Date((eventTime.period_end + eventTime.seconds_from_gmt) * 1000)
  }
}

export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function dayRange(date: Date): { lower: number; upper: number } {
  return {
    lower: dateToTimestamp(startOfDay(date)),
    upper: dateToTimestamp(endOfDay(date)),
  }
}

export function monthRange(year: number, month: number): { lower: number; upper: number } {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return {
    lower: dateToTimestamp(startOfDay(first)),
    upper: dateToTimestamp(endOfDay(last)),
  }
}

export type CalendarEvent = { type: 'todo'; event: Todo } | { type: 'schedule'; event: Schedule }

function eventTimeOverlapsRange(eventTime: EventTime, lower: number, upper: number): boolean {
  switch (eventTime.time_type) {
    case 'at':
      return eventTime.timestamp >= lower && eventTime.timestamp <= upper
    case 'period':
      return eventTime.period_start <= upper && eventTime.period_end >= lower
    case 'allday':
      return eventTime.period_start <= upper && eventTime.period_end >= lower
  }
}

export function groupEventsByDate(
  todos: Todo[],
  schedules: Schedule[],
  lower: number,
  upper: number,
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()

  const addToDate = (dateKey: string, event: CalendarEvent) => {
    const list = map.get(dateKey) ?? []
    list.push(event)
    map.set(dateKey, list)
  }

  const assignEvent = (eventTime: EventTime, calEvent: CalendarEvent) => {
    if (!eventTimeOverlapsRange(eventTime, lower, upper)) return
    const start = eventTimeToStartDate(eventTime)
    const end = eventTimeToEndDate(eventTime)
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (current <= endDay) {
      const key = formatDateKey(current)
      addToDate(key, calEvent)
      current.setDate(current.getDate() + 1)
    }
  }

  for (const todo of todos) {
    if (todo.event_time) {
      assignEvent(todo.event_time, { type: 'todo', event: todo })
    }
  }

  for (const schedule of schedules) {
    assignEvent(schedule.event_time, { type: 'schedule', event: schedule })
  }

  return map
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
