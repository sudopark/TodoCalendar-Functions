import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../src/components/AuthGuard'
import { useAuthStore } from '../../src/stores/authStore'

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: async () => [] },
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
  beforeEach(() => {
    vi.clearAllMocks()
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
})
