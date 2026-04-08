import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TagManagementPage } from '../../src/pages/TagManagementPage'
import { useToastStore } from '../../src/stores/toastStore'

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn().mockResolvedValue([]),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(<MemoryRouter><TagManagementPage /></MemoryRouter>)
}

describe('TagManagementPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useToastStore.setState({ toasts: [] })
    const { useEventTagStore } = await import('../../src/stores/eventTagStore')
    useEventTagStore.setState({ tags: new Map() })
  })

  it('"태그 관리" 제목을 표시한다', () => {
    renderPage()
    expect(screen.getByText('태그 관리')).toBeInTheDocument()
  })

  it('새 태그 이름 입력 후 추가하면 새 태그가 목록에 표시된다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockResolvedValue({ uuid: 'new', name: '새 태그' })
    renderPage()
    await userEvent.type(screen.getByPlaceholderText('새 태그 이름'), '새 태그')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(screen.getByText('새 태그')).toBeInTheDocument()
  })

  it('태그 수정 버튼 클릭 시 인라인 편집 폼이 표시된다', async () => {
    // given: 태그가 있는 상태 — store에 직접 주입
    const { useEventTagStore } = await import('../../src/stores/eventTagStore')
    useEventTagStore.setState({
      tags: new Map([['t1', { uuid: 't1', name: '업무', color_hex: '#ff0000' }]])
    })
    renderPage()
    // when: 수정 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    // then: 인라인 편집 입력 필드가 나타남
    expect(screen.getByDisplayValue('업무')).toBeInTheDocument()
  })

  it('태그 생성 실패 시 에러 토스트가 표시된다', async () => {
    // given
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage()

    // when
    await userEvent.type(screen.getByPlaceholderText('새 태그 이름'), '실패 태그')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '태그 생성에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('태그 수정 실패 시 에러 토스트가 표시된다', async () => {
    // given: 태그가 있는 상태
    const { useEventTagStore } = await import('../../src/stores/eventTagStore')
    useEventTagStore.setState({
      tags: new Map([['t1', { uuid: 't1', name: '업무', color_hex: '#ff0000' }]])
    })
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.updateTag).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage()

    // when: 수정 버튼 → 저장
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    await userEvent.click(screen.getByText('저장'))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '태그 수정에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('태그 삭제 실패 시 에러 토스트가 표시된다', async () => {
    // given
    const { useEventTagStore } = await import('../../src/stores/eventTagStore')
    useEventTagStore.setState({
      tags: new Map([['t1', { uuid: 't1', name: '업무', color_hex: '#ff0000' }]])
    })
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.deleteTag).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage()

    // when: 목록의 삭제 버튼 클릭 → 다이얼로그에서 "태그만 삭제" 클릭
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' })
    await userEvent.click(deleteButtons[0]) // 목록의 삭제 버튼
    const tagOnlyBtn = screen.getByRole('button', { name: '태그만 삭제' })
    await userEvent.click(tagOnlyBtn)

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.message === '태그 삭제에 실패했습니다' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('태그 삭제 버튼 클릭 시 확인 다이얼로그가 표시된다', async () => {
    // given: 태그가 있는 상태
    const { useEventTagStore } = await import('../../src/stores/eventTagStore')
    useEventTagStore.setState({
      tags: new Map([['t1', { uuid: 't1', name: '업무', color_hex: '#ff0000' }]])
    })
    renderPage()
    // when: 삭제 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    // then: 확인 다이얼로그가 표시됨
    expect(screen.getByText('태그 삭제')).toBeInTheDocument()
  })
})
