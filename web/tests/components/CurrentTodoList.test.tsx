import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CurrentTodoList } from '../../src/components/CurrentTodoList'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    getCurrentTodos: vi.fn(),
    completeTodo: vi.fn(),
  },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedules: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/firebase', () => ({
  auth: {},
  db: {},
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderComponent() {
  return render(
    <MemoryRouter>
      <CurrentTodoList />
    </MemoryRouter>
  )
}

describe('CurrentTodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
      selector({ getColorForTagId: () => null })
    )
    useCurrentTodosStore.setState({ todos: [] })
  })

  it('current todo가 없으면 아무것도 렌더링하지 않는다', () => {
    useCurrentTodosStore.setState({ todos: [] })

    const { container } = renderComponent()

    expect(container.firstChild).toBeNull()
  })

  it('current todo 목록을 표시한다', () => {
    const todos = [
      { uuid: 'ct1', name: '시간 없는 할 일 A', is_current: true, event_time: null },
      { uuid: 'ct2', name: '시간 없는 할 일 B', is_current: true, event_time: null },
    ]
    useCurrentTodosStore.setState({ todos: todos as any })

    renderComponent()

    expect(screen.getByText('시간 없는 할 일 A')).toBeInTheDocument()
    expect(screen.getByText('시간 없는 할 일 B')).toBeInTheDocument()
  })

  it('항목을 클릭하면 해당 이벤트 상세 페이지로 이동한다', async () => {
    const todos = [{ uuid: 'ct-nav', name: '이동 테스트', is_current: true, event_time: null }]
    useCurrentTodosStore.setState({ todos: todos as any })

    renderComponent()
    await userEvent.click(screen.getByRole('button', { name: /이동 테스트/ }))

    expect(mockNavigate.mock.calls[0][0]).toBe('/events/ct-nav')
  })
})

describe('CurrentTodoList — 완료', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
      selector({ getColorForTagId: () => null })
    )
    useCurrentTodosStore.setState({ todos: [] })
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, lastRange: null })
  })

  it('체크박스 클릭 시 completeTodo API가 호출된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.completeTodo).mockResolvedValue({ uuid: 'done-1', done_at: 1000 } as any)
    const todo = { uuid: 't1', name: '완료 할 일', is_current: true, event_time: null }
    useCurrentTodosStore.setState({ todos: [todo as any] })

    render(
      <MemoryRouter>
        <CurrentTodoList />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('checkbox', { name: '완료 할 일' }))
    expect(todoApi.completeTodo).toHaveBeenCalled()
  })

  it('완료 후 해당 Todo가 목록에서 사라진다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.completeTodo).mockResolvedValue({ uuid: 'done-1', done_at: 1000 } as any)
    const todo = { uuid: 't1', name: '완료 할 일', is_current: true, event_time: null }
    useCurrentTodosStore.setState({ todos: [todo as any] })
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, lastRange: null })

    render(<MemoryRouter><CurrentTodoList /></MemoryRouter>)
    await userEvent.click(screen.getByRole('checkbox', { name: '완료 할 일' }))

    await waitFor(() => {
      expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 't1')).toBe(false)
    })
  })
})
