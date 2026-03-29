import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { EventDetailPage } from '../../src/pages/EventDetailPage'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import { todoApi } from '../../src/api/todoApi'
import { scheduleApi } from '../../src/api/scheduleApi'
import { eventDetailApi } from '../../src/api/eventDetailApi'

vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodo: vi.fn(), getCurrentTodos: async () => [] },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedule: vi.fn() },
}))
vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: { getEventDetail: vi.fn() },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderWithRoute(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/events/${id}`]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
      selector({ getColorForTagId: () => null })
    )
    vi.mocked(eventDetailApi.getEventDetail).mockRejectedValue(new Error('no detail'))
  })

  it('이벤트를 로드하는 동안 로딩 스피너를 표시한다', () => {
    vi.mocked(todoApi.getTodo).mockReturnValue(new Promise(() => {})) // never resolves

    renderWithRoute('todo-1')

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('Todo 이벤트를 로드하여 이름과 시간을 표시한다', async () => {
    const todo = {
      uuid: 'todo-1',
      name: '중요 할 일',
      is_current: false,
      event_time: { time_type: 'at' as const, timestamp: Math.floor(new Date(2024, 2, 15, 14, 30).getTime() / 1000) },
    }
    vi.mocked(todoApi.getTodo).mockResolvedValue(todo)

    renderWithRoute('todo-1')

    await waitFor(() => {
      expect(screen.getByText('중요 할 일')).toBeInTheDocument()
    })
    expect(screen.getByText(/오후 2:30/)).toBeInTheDocument()
  })

  it('이벤트 상세 정보(장소, URL, 메모)가 있으면 표시한다', async () => {
    const todo = { uuid: 'td2', name: '상세 있는 할 일', is_current: false, event_time: null }
    const detail = { place: '서울 카페', url: 'https://example.com', memo: '메모 내용' }
    vi.mocked(todoApi.getTodo).mockResolvedValue(todo)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue(detail)

    renderWithRoute('td2')

    await waitFor(() => {
      expect(screen.getByText('서울 카페')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'https://example.com' })).toBeInTheDocument()
    expect(screen.getByText('메모 내용')).toBeInTheDocument()
  })

  it('이벤트를 찾지 못하면 안내 메시지를 표시한다', async () => {
    vi.mocked(todoApi.getTodo).mockRejectedValue(new Error('not found'))
    vi.mocked(scheduleApi.getSchedule).mockRejectedValue(new Error('not found'))

    renderWithRoute('unknown-id')

    await waitFor(() => {
      expect(screen.getByText('이벤트를 찾을 수 없습니다')).toBeInTheDocument()
    })
  })

  it('뒤로 버튼을 클릭하면 이전 페이지로 이동한다', async () => {
    const todo = { uuid: 'td3', name: '할 일', is_current: false, event_time: null }
    vi.mocked(todoApi.getTodo).mockResolvedValue(todo)

    renderWithRoute('td3')

    await waitFor(() => screen.getByText('할 일'))
    await userEvent.click(screen.getByRole('button', { name: /뒤로/ }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })
})
