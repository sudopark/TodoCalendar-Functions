import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CurrentTodoList } from '../../src/components/CurrentTodoList'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/stores/currentTodosStore', () => ({ useCurrentTodosStore: vi.fn() }))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/api/todoApi', () => ({ todoApi: { getCurrentTodos: async () => [] } }))

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
  })

  it('current todo가 없으면 아무것도 렌더링하지 않는다', () => {
    vi.mocked(useCurrentTodosStore).mockImplementation((selector: any) =>
      selector({ todos: [], fetch: vi.fn() })
    )

    const { container } = renderComponent()

    expect(container.firstChild).toBeNull()
  })

  it('current todo 목록을 표시한다', () => {
    const todos = [
      { uuid: 'ct1', name: '시간 없는 할 일 A', is_current: true, event_time: null },
      { uuid: 'ct2', name: '시간 없는 할 일 B', is_current: true, event_time: null },
    ]
    vi.mocked(useCurrentTodosStore).mockImplementation((selector: any) =>
      selector({ todos, fetch: vi.fn() })
    )

    renderComponent()

    expect(screen.getByText('시간 없는 할 일 A')).toBeInTheDocument()
    expect(screen.getByText('시간 없는 할 일 B')).toBeInTheDocument()
  })

  it('항목을 클릭하면 해당 이벤트 상세 페이지로 이동한다', async () => {
    const todos = [{ uuid: 'ct-nav', name: '이동 테스트', is_current: true, event_time: null }]
    vi.mocked(useCurrentTodosStore).mockImplementation((selector: any) =>
      selector({ todos, fetch: vi.fn() })
    )

    renderComponent()
    await userEvent.click(screen.getByRole('button', { name: /이동 테스트/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/events/ct-nav')
  })
})
