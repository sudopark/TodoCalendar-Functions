import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from '../../src/pages/LoginPage'
import { useAuthStore } from '../../src/stores/authStore'

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('LoginPage', () => {
  const mockSignInWithGoogle = vi.fn()
  const mockSignInWithApple = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      user: null,
      loading: false,
    } as any)
  })

  it('Google 로그인 버튼이 표시된다', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  })

  it('Apple 로그인 버튼이 표시된다', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument()
  })

  it('Google 버튼 클릭 시 Google 로그인을 시도한다', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined)
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledOnce())
  })

  it('Apple 버튼 클릭 시 Apple 로그인을 시도한다', async () => {
    mockSignInWithApple.mockResolvedValue(undefined)
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /apple/i }))

    await waitFor(() => expect(mockSignInWithApple).toHaveBeenCalledOnce())
  })

  it('로그인 시도 중에는 버튼이 비활성화된다', async () => {
    mockSignInWithGoogle.mockReturnValue(new Promise(() => {})) // never resolves
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /google/i })).toBeDisabled()
    })
  })

  it('로그인 실패 시 에러 메시지가 표시된다', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('로그인 실패'))
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
