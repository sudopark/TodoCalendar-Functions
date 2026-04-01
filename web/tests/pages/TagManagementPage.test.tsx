import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TagManagementPage } from '../../src/pages/TagManagementPage'

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
  beforeEach(() => { vi.clearAllMocks() })

  it('"태그 관리" 제목을 표시한다', () => {
    renderPage()
    expect(screen.getByText('태그 관리')).toBeInTheDocument()
  })

  it('새 태그 이름 입력 후 추가하면 createTag API가 호출된다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockResolvedValue({ uuid: 'new', name: '새 태그' })
    renderPage()
    await userEvent.type(screen.getByPlaceholderText('새 태그 이름'), '새 태그')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(eventTagApi.createTag).toHaveBeenCalled()
  })
})
