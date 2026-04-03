import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DoneTodosPage } from '../../src/pages/DoneTodosPage'
import { doneTodoApi } from '../../src/api/doneTodoApi'
import { useDoneTodosStore } from '../../src/stores/doneTodosStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import { todoApi } from '../../src/api/todoApi'
import { useToastStore } from '../../src/stores/toastStore'

vi.mock('../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(),
    deleteDoneTodo: vi.fn(),
    revertDoneTodo: vi.fn(),
  },
}))

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getCurrentTodos: vi.fn() },
}))

vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))

// IntersectionObserver mock (jsdom 미지원)
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: IntersectionObserverCallback) {}
  trigger() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as any)
  }
}

const makeDone = (id: string) => ({
  uuid: id, name: `완료-${id}`, done_at: 1000, origin_event_id: null,
  event_time: null, event_tag_id: null,
})

describe('DoneTodosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDoneTodosStore.getState().reset()
    useToastStore.setState({ toasts: [] })
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
      selector({ getColorForTagId: () => null })
    )
  })

  function renderPage() {
    return render(<MemoryRouter><DoneTodosPage /></MemoryRouter>)
  }

  it('마운트 시 done todos를 불러와 목록을 렌더한다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1'), makeDone('d2')])

    // when
    renderPage()

    // then
    await waitFor(() => {
      expect(screen.getByText('완료-d1')).toBeInTheDocument()
      expect(screen.getByText('완료-d2')).toBeInTheDocument()
    })
  })

  it('모든 항목을 불러오면 "모두 표시됨" 텍스트가 나타난다', async () => {
    // given: PAGE_SIZE(20)보다 적게 반환
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])

    // when
    renderPage()

    // then
    await waitFor(() => {
      expect(screen.getByText('모두 표시됨')).toBeInTheDocument()
    })
  })

  it('삭제 버튼 클릭 → 확인 다이얼로그 → 확인 시 항목이 제거된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])
    vi.mocked(doneTodoApi.deleteDoneTodo).mockResolvedValue({ status: 'ok' })

    renderPage()
    await waitFor(() => screen.getByText('완료-d1'))

    // when: 삭제 버튼 → 다이얼로그 확인
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      expect(screen.queryByText('완료-d1')).not.toBeInTheDocument()
    })
  })

  it('되돌리기 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])
    vi.mocked(doneTodoApi.revertDoneTodo).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderPage()
    await waitFor(() => screen.getByText('완료-d1'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '되돌리기에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('삭제 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])
    vi.mocked(doneTodoApi.deleteDoneTodo).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderPage()
    await waitFor(() => screen.getByText('완료-d1'))

    // when: 삭제 버튼 → 다이얼로그 확인
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '삭제에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('되돌리기 버튼 클릭 시 항목이 목록에서 제거된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({
      uuid: 'd1', name: '완료-d1', is_current: true,
    } as any)
    vi.mocked(todoApi.getCurrentTodos).mockResolvedValue([])

    renderPage()
    await waitFor(() => screen.getByText('완료-d1'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))

    // then
    await waitFor(() => {
      expect(screen.queryByText('완료-d1')).not.toBeInTheDocument()
    })
  })
})
