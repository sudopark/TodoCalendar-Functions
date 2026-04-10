import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../src/components/AuthGuard'
import { useAuthStore } from '../../src/stores/authStore'
import { useToastStore } from '../../src/stores/toastStore'

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn() },
}))

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getCurrentTodos: vi.fn() },
}))

vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: { getForemostEvent: vi.fn() },
}))

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    const { todoApi } = await import('../../src/api/todoApi')
    const { foremostApi } = await import('../../src/api/foremostApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([])
    vi.mocked(todoApi.getCurrentTodos).mockResolvedValue([])
    vi.mocked(foremostApi.getForemostEvent).mockResolvedValue(null)
    useToastStore.setState({ toasts: [] })
  })

  it('인증 확인 중에는 보호된 컨텐츠도 로그인 페이지도 보이지 않는다', () => {
    vi.mocked(useAuthStore).mockReturnValue({ account: null, loading: true } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    expect(screen.queryByText('보호된 페이지')).toBeNull()
    expect(screen.queryByText('로그인 페이지')).toBeNull()
  })

  it('로그인하지 않은 사용자는 로그인 페이지로 이동한다', () => {
    vi.mocked(useAuthStore).mockReturnValue({ account: null, loading: false } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    expect(screen.queryByText('보호된 페이지')).toBeNull()
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('로그인한 사용자는 요청한 페이지를 볼 수 있다', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      account: { uid: 'user-123' },
      loading: false,
    } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
    expect(screen.queryByText('로그인 페이지')).toBeNull()
  })

  it('로그인 후 일부 데이터 로드에 실패해도 앱은 계속 표시된다', async () => {
    // given: 태그 API가 실패하도록 설정 (부분 실패)
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockRejectedValue(new Error('network'))

    // when: 로그인 상태로 렌더링
    vi.mocked(useAuthStore).mockReturnValue({
      account: { uid: 'user-123' },
      loading: false,
    } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    // then: 부분 실패해도 앱은 계속 표시되고, 에러 토스트는 없다
    await waitFor(() => {
      expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts.some(t => t.type === 'error')).toBe(false)
  })
})
