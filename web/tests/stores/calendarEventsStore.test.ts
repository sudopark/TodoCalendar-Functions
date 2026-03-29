import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn() },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn() },
}))

describe('calendarEventsStore', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false })
    vi.clearAllMocks()
  })

  it('초기 상태에서 eventsByDate는 빈 Map이다', () => {
    expect(useCalendarEventsStore.getState().eventsByDate.size).toBe(0)
  })

  it('fetchEventsForRange 호출 시 날짜별로 이벤트를 그룹핑한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    vi.mocked(todoApi.getTodos).mockResolvedValue([
      {
        uuid: 'todo-1', name: 'Task', is_current: false,
        event_time: { time_type: 'at' as const, timestamp: 1743375600 },
      },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      {
        uuid: 'sch-1', name: 'Meeting',
        event_time: { time_type: 'at' as const, timestamp: 1743375600 },
      },
    ])

    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    const events = useCalendarEventsStore.getState().eventsByDate
    expect(events.size).toBeGreaterThan(0)
  })

  it('fetchEventsForRange 호출 중 loading이 true가 된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    let resolveTodos: (v: any) => void
    vi.mocked(todoApi.getTodos).mockReturnValue(new Promise(r => { resolveTodos = r }))
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])

    const promise = useCalendarEventsStore.getState().fetchEventsForRange(0, 100)
    expect(useCalendarEventsStore.getState().loading).toBe(true)
    expect(useCalendarEventsStore.getState().eventsByDate.size).toBe(0)

    resolveTodos!([])
    await promise
    expect(useCalendarEventsStore.getState().loading).toBe(false)
  })

  it('fetchEventsForRange 실패 시 빈 Map을 유지하고 loading이 끝난다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    vi.mocked(todoApi.getTodos).mockRejectedValue(new Error('network'))
    vi.mocked(scheduleApi.getSchedules).mockRejectedValue(new Error('network'))

    await useCalendarEventsStore.getState().fetchEventsForRange(0, 100)

    expect(useCalendarEventsStore.getState().eventsByDate.size).toBe(0)
    expect(useCalendarEventsStore.getState().loading).toBe(false)
  })
})
