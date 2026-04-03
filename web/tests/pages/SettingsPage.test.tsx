import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '../../src/pages/SettingsPage'
import { settingApi } from '../../src/api/settingApi'
import { accountApi } from '../../src/api/accountApi'
import { useAuthStore } from '../../src/stores/authStore'
import { useToastStore } from '../../src/stores/toastStore'

vi.mock('../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn(),
    updateDefaultTagColors: vi.fn(),
  },
}))

vi.mock('../../src/api/accountApi', () => ({
  accountApi: { deleteAccount: vi.fn() },
}))

// authStore는 스토어 모킹 (계정 정보 제어를 위해)
vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockColors = { holiday: '#ef4444', default: '#3b82f6' }

describe('SettingsPage', () => {
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useToastStore.setState({ toasts: [] })
    vi.mocked(useAuthStore).mockImplementation((selector: any) =>
      selector({ account: { uid: 'u1', email: 'test@example.com' }, signOut: mockSignOut })
    )
    vi.mocked(settingApi.getDefaultTagColors).mockResolvedValue(mockColors)
  })

  function renderPage() {
    return render(<MemoryRouter><SettingsPage /></MemoryRouter>)
  }

  it('계정 이메일이 표시된다', async () => {
    // given / when
    renderPage()

    // then
    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument())
  })

  it('로그아웃 버튼 클릭 시 signOut이 호출된다', async () => {
    // given
    renderPage()
    await waitFor(() => screen.getByText('test@example.com'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    // then
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('마운트 시 기본 태그 색상을 로드한다', async () => {
    // given / when
    renderPage()

    // then: 두 슬롯(holiday, default)의 컬러 팔레트가 렌더됨
    await waitFor(() => {
      expect(screen.getByText('공휴일 색상')).toBeInTheDocument()
      expect(screen.getByText('기본 색상')).toBeInTheDocument()
    })
  })

  it('저장 버튼 클릭 시 에러 없이 처리된다', async () => {
    // given
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue(mockColors)
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '색상 저장' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '색상 저장' }))

    // then: 에러 없이 처리됨
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  it('색상 로드 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(settingApi.getDefaultTagColors).mockRejectedValue(new Error('network'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // when
    renderPage()

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '색상 로드에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('색상 저장 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(settingApi.updateDefaultTagColors).mockRejectedValue(new Error('save fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '색상 저장' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '색상 저장' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '색상 저장에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('색상 저장 성공 시 성공 토스트가 표시된다', async () => {
    // given
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue(mockColors)
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '색상 저장' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '색상 저장' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '색상이 저장되었습니다' && t.type === 'success')).toBe(true)
    })
  })

  it('계정 삭제 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(accountApi.deleteAccount).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '계정 삭제' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '계정 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '계정 삭제에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('계정 삭제 버튼 클릭 → 확인 다이얼로그 → 확인 시 signOut이 호출된다', async () => {
    // given
    vi.mocked(accountApi.deleteAccount).mockResolvedValue({ status: 'ok' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '계정 삭제' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '계정 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })
})
