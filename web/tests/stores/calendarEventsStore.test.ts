import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn() },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn() },
}))

// 2025-03-31 00:00:00 UTC
const MARCH31_TIMESTAMP = 1743375600
const MARCH31_KEY = '2025-03-31'

describe('calendarEventsStore', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false })
    vi.clearAllMocks()
  })

  it('이벤트가 없는 상태에서는 어떤 날짜를 조회해도 결과가 없다', () => {
    // given: 빈 스토어
    // when: 특정 날짜 조회
    // then: 이벤트 없음
    expect(useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)).toBeUndefined()
  })

  it('API에서 받은 이벤트는 해당 날짜키로 조회할 수 있다', async () => {
    // given: API가 특정 날짜의 Todo와 Schedule을 반환한다
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      { uuid: 'sch-1', name: 'Meeting', event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])

    // when: 해당 범위로 이벤트를 조회한다
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // then: 해당 날짜로 Todo와 Schedule을 모두 찾을 수 있다
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)
    expect(events).toBeDefined()
    expect(events?.some(e => e.type === 'todo' && e.event.uuid === 'todo-1')).toBe(true)
    expect(events?.some(e => e.type === 'schedule' && e.event.uuid === 'sch-1')).toBe(true)
  })

  it('API 호출이 실패하면 이벤트를 조회할 수 없다', async () => {
    // given: API가 실패한다
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockRejectedValue(new Error('network'))
    vi.mocked(scheduleApi.getSchedules).mockRejectedValue(new Error('network'))

    // when: 이벤트 조회를 시도한다
    await useCalendarEventsStore.getState().fetchEventsForRange(0, 100)

    // then: 이벤트 결과가 없다
    expect(useCalendarEventsStore.getState().eventsByDate.size).toBe(0)
  })
})
