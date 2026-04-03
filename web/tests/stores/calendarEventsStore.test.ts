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

  it('같은 범위로 재요청하면 기존 데이터가 유지된다', async () => {
    // given: 이미 한 번 fetch 완료
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // when: 같은 범위로 다시 fetch
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // then: 기존 데이터가 유지된다
    const events = useCalendarEventsStore.getState().eventsByDate
    expect(events.get(MARCH31_KEY)?.some(e => e.event.uuid === 'todo-1')).toBe(true)
  })

  it('다른 범위로 요청하면 새로 fetch한다', async () => {
    // given: 이미 한 번 fetch 완료
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // when: 다른 범위로 fetch — API가 빈 결과 반환
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743465600, 1743552000)

    // then: 새 범위의 데이터로 교체된다 (빈 결과)
    const events = useCalendarEventsStore.getState().eventsByDate
    expect(events.get(MARCH31_KEY)).toBeUndefined()
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

// 2025-03-31 UTC
const AT_TIMESTAMP = 1743375600
// 'MARCH31_KEY' and 'MARCH31_KEY' already defined at top of file as '2025-03-31'

describe('calendarEventsStore — reset', () => {
  it('reset 호출 시 초기 상태로 돌아간다', async () => {
    // given: 스토어에 데이터가 있는 상태
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // when: reset 호출
    useCalendarEventsStore.getState().reset()

    // then: 초기 상태
    const state = useCalendarEventsStore.getState()
    expect(state.eventsByDate.size).toBe(0)
    expect(state.lastRange).toBeNull()
  })
})

describe('calendarEventsStore — mutation', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, lastRange: null })
    vi.clearAllMocks()
  })

  it('addEvent를 호출하면 해당 이벤트를 날짜별 목록에서 조회할 수 있다', async () => {
    // given: 범위 fetch 후 lastRange가 저장됨
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // when: 새 todo 이벤트 추가
    const newTodo = { uuid: 'new-1', name: '새 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: AT_TIMESTAMP } }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: newTodo })

    // then: 해당 날짜에서 조회 가능
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)
    expect(events?.some(e => e.event.uuid === 'new-1')).toBe(true)
  })

  it('removeEvent를 호출하면 해당 이벤트를 더 이상 조회할 수 없다', async () => {
    // given: 이벤트가 있는 상태
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: AT_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // when: 이벤트 제거
    useCalendarEventsStore.getState().removeEvent('todo-1')

    // then: 해당 날짜에서 조회 불가
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.some(e => e.event.uuid === 'todo-1')).toBe(false)
  })

  it('replaceEvent를 호출하면 기존 이벤트가 새 이벤트로 교체된다', async () => {
    // given: 이벤트가 있는 상태
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: '원래 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: AT_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    // when: 이벤트 교체
    const updated = { uuid: 'todo-1', name: '수정된 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: AT_TIMESTAMP } }
    useCalendarEventsStore.getState().replaceEvent('todo-1', { type: 'todo', event: updated })

    // then: 새 이름으로 조회됨
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.find(e => e.event.uuid === 'todo-1')?.event.name).toBe('수정된 이름')
  })
})
