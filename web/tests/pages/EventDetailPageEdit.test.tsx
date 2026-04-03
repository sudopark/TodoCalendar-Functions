import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EventDetailPage } from '../../src/pages/EventDetailPage'
import { todoApi } from '../../src/api/todoApi'
import { eventDetailApi } from '../../src/api/eventDetailApi'
import { useForemostEventStore } from '../../src/stores/foremostEventStore'
import { foremostApi } from '../../src/api/foremostApi'
import { useToastStore } from '../../src/stores/toastStore'

vi.mock('../../src/stores/eventTagStore', () => ({
  useEventTagStore: vi.fn((selector: any) => selector({ getColorForTagId: () => null })),
}))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodo: vi.fn() },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedule: vi.fn() },
}))
vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: {
    getEventDetail: vi.fn(),
    updateEventDetail: vi.fn(),
    deleteEventDetail: vi.fn(),
  },
}))
vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: {
    getForemostEvent: vi.fn(),
    setForemostEvent: vi.fn(),
    removeForemostEvent: vi.fn(),
  },
}))

const mockTodo = { uuid: 'ev1', name: '할 일', is_current: false, event_time: null }

function renderPage(eventId = 'ev1') {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EventDetailPage — 인라인 편집', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useForemostEventStore.setState({ foremostEvent: null })
    useToastStore.setState({ toasts: [] })
    vi.mocked(todoApi.getTodo).mockResolvedValue(mockTodo as any)
  })

  it('detail이 있을 때 편집 버튼이 표시된다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: '서울', url: '', memo: '',
    })

    // when
    renderPage()

    // then
    await waitFor(() => expect(screen.getByRole('button', { name: '편집' })).toBeInTheDocument())
  })

  it('편집 버튼 클릭 시 저장/취소 버튼과 입력 필드가 나타난다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '편집' }))

    // then
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('서울')).toBeInTheDocument()
  })

  it('저장 클릭 시 API를 호출하고 읽기 모드로 돌아간다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({ place: '부산', url: '', memo: '' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))
    await userEvent.click(screen.getByRole('button', { name: '편집' }))

    const input = screen.getByDisplayValue('서울')
    await userEvent.clear(input)
    await userEvent.type(input, '부산')

    // when
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()
      expect(screen.getByText('부산')).toBeInTheDocument()
    })
  })

  it('저장 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    vi.mocked(eventDetailApi.updateEventDetail).mockRejectedValue(new Error('save fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))
    await userEvent.click(screen.getByRole('button', { name: '편집' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '이벤트 상세 저장에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('취소 클릭 시 입력값이 원복되고 읽기 모드로 돌아간다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))
    await userEvent.click(screen.getByRole('button', { name: '편집' }))
    await userEvent.type(screen.getByDisplayValue('서울'), 'xxx')

    // when
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()
      expect(screen.getByText('서울')).toBeInTheDocument()
    })
  })
})

describe('EventDetailPage — Foremost 토글', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useForemostEventStore.setState({ foremostEvent: null })
    vi.mocked(todoApi.getTodo).mockResolvedValue(mockTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockRejectedValue(new Error('no detail'))
  })

  it('현재 foremost가 아닐 때 "고정 설정" 버튼이 표시된다', async () => {
    // given: foremostEvent null
    renderPage()

    // then
    await waitFor(() => expect(screen.getByRole('button', { name: '고정 설정' })).toBeInTheDocument())
  })

  it('현재 이벤트가 foremost일 때 "고정 해제" 버튼이 표시된다', async () => {
    // given
    useForemostEventStore.setState({
      foremostEvent: { event_id: 'ev1', is_todo: true, event: mockTodo as any },
    })
    renderPage()

    // then
    await waitFor(() => expect(screen.getByRole('button', { name: '고정 해제' })).toBeInTheDocument())
  })

  it('고정 설정 클릭 시 foremostEventStore가 갱신된다', async () => {
    // given
    const newForemost = { event_id: 'ev1', is_todo: true, event: mockTodo as any }
    vi.mocked(foremostApi.setForemostEvent).mockResolvedValue(newForemost as any)
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '고정 설정' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '고정 설정' }))

    // then
    await waitFor(() =>
      expect(useForemostEventStore.getState().foremostEvent?.event_id).toBe('ev1')
    )
  })

  it('고정 해제 클릭 시 foremostEventStore가 null로 갱신된다', async () => {
    // given: 현재 이벤트가 foremost로 설정되어 있음
    useForemostEventStore.setState({
      foremostEvent: { event_id: 'ev1', is_todo: true, event: mockTodo as any },
    })
    vi.mocked(foremostApi.removeForemostEvent).mockResolvedValue({ status: 'ok' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '고정 해제' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '고정 해제' }))

    // then
    await waitFor(() =>
      expect(useForemostEventStore.getState().foremostEvent).toBeNull()
    )
  })
})
