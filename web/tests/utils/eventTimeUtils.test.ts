import { describe, it, expect } from 'vitest'
import {
  eventTimeToStartDate,
  eventTimeToEndDate,
  dateToTimestamp,
  dayRange,
  monthRange,
  groupEventsByDate,
  formatDateKey,
  eventTimeOverlapsRange,
} from '../../src/utils/eventTimeUtils'
import type { EventTime, Todo, Schedule } from '../../src/models'

describe('eventTimeToStartDate', () => {
  it('"at" 타입이면 timestamp를 Date로 변환한다', () => {
    const et: EventTime = { time_type: 'at', timestamp: 1700000000 }
    const date = eventTimeToStartDate(et)
    expect(date.getTime()).toBe(1700000000 * 1000)
  })

  it('"period" 타입이면 period_start를 Date로 변환한다', () => {
    const et: EventTime = { time_type: 'period', period_start: 1700000000, period_end: 1700100000 }
    const date = eventTimeToStartDate(et)
    expect(date.getTime()).toBe(1700000000 * 1000)
  })

  it('"allday" 타입이면 period_start + seconds_from_gmt로 변환한다', () => {
    const et: EventTime = { time_type: 'allday', period_start: 1700000000, period_end: 1700086400, seconds_from_gmt: 32400 }
    const date = eventTimeToStartDate(et)
    expect(date.getTime()).toBe((1700000000 + 32400) * 1000)
  })
})

describe('eventTimeToEndDate', () => {
  it('"period" 타입이면 period_end를 Date로 변환한다', () => {
    const et: EventTime = { time_type: 'period', period_start: 1700000000, period_end: 1700100000 }
    const date = eventTimeToEndDate(et)
    expect(date.getTime()).toBe(1700100000 * 1000)
  })
})

describe('dateToTimestamp', () => {
  it('Date를 Unix timestamp(초)로 변환한다', () => {
    const date = new Date(1700000000 * 1000)
    expect(dateToTimestamp(date)).toBe(1700000000)
  })
})

describe('dayRange', () => {
  it('주어진 날짜의 시작~끝 timestamp를 반환한다', () => {
    const date = new Date(2024, 5, 15, 12, 30)
    const range = dayRange(date)
    const start = new Date(range.lower * 1000)
    const end = new Date(range.upper * 1000)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })
})

describe('monthRange', () => {
  it('주어진 연/월의 첫째날~마지막날 timestamp를 반환한다', () => {
    const range = monthRange(2024, 1) // February
    const start = new Date(range.lower * 1000)
    const end = new Date(range.upper * 1000)
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(1)
    expect(end.getDate()).toBe(29) // 2024 is a leap year
    expect(end.getMonth()).toBe(1)
  })
})

describe('formatDateKey', () => {
  it('날짜를 YYYY-MM-DD 문자열로 변환한다', () => {
    const date = new Date(2024, 0, 5)
    expect(formatDateKey(date)).toBe('2024-01-05')
  })
})

describe('groupEventsByDate', () => {
  it('Todo와 Schedule을 날짜별로 그룹핑한다', () => {
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))

    const todos: Todo[] = [
      {
        uuid: 't1',
        name: 'Todo 1',
        is_current: false,
        event_time: { time_type: 'at', timestamp: dateToTimestamp(new Date(2024, 5, 15, 10, 0)) },
      },
    ]
    const schedules: Schedule[] = [
      {
        uuid: 's1',
        name: 'Schedule 1',
        event_time: { time_type: 'period', period_start: dateToTimestamp(new Date(2024, 5, 10, 9, 0)), period_end: dateToTimestamp(new Date(2024, 5, 10, 17, 0)) },
      },
    ]

    const result = groupEventsByDate(todos, schedules, lower, upper)
    expect(result.get('2024-06-15')).toHaveLength(1)
    expect(result.get('2024-06-15')![0].type).toBe('todo')
    expect(result.get('2024-06-10')).toHaveLength(1)
    expect(result.get('2024-06-10')![0].type).toBe('schedule')
  })

  it('기간 이벤트는 여러 날짜에 걸쳐 나타난다', () => {
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))

    const schedules: Schedule[] = [
      {
        uuid: 's1',
        name: 'Multi-day',
        event_time: {
          time_type: 'period',
          period_start: dateToTimestamp(new Date(2024, 5, 10, 9, 0)),
          period_end: dateToTimestamp(new Date(2024, 5, 12, 17, 0)),
        },
      },
    ]

    const result = groupEventsByDate([], schedules, lower, upper)
    expect(result.get('2024-06-10')).toHaveLength(1)
    expect(result.get('2024-06-11')).toHaveLength(1)
    expect(result.get('2024-06-12')).toHaveLength(1)
  })

  it('범위 밖의 이벤트는 포함하지 않는다', () => {
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))

    const todos: Todo[] = [
      {
        uuid: 't1',
        name: 'Outside',
        is_current: false,
        event_time: { time_type: 'at', timestamp: dateToTimestamp(new Date(2024, 6, 5, 10, 0)) },
      },
    ]

    const result = groupEventsByDate(todos, [], lower, upper)
    expect(result.size).toBe(0)
  })
})

describe('eventTimeOverlapsRange', () => {
  it('at 이벤트가 범위 안에 있으면 true를 반환한다', () => {
    const et: EventTime = { time_type: 'at', timestamp: 1000 }
    expect(eventTimeOverlapsRange(et, 900, 1100)).toBe(true)
  })

  it('at 이벤트가 범위 밖에 있으면 false를 반환한다', () => {
    const et: EventTime = { time_type: 'at', timestamp: 500 }
    expect(eventTimeOverlapsRange(et, 900, 1100)).toBe(false)
  })
})
