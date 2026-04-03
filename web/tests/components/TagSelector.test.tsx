import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TagSelector } from '../../src/components/TagSelector'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function mockTags(tags: Array<{ uuid: string; name: string; color_hex?: string }>) {
  vi.mocked(useEventTagStore).mockImplementation((sel: any) => sel({ tags: new Map(tags.map(t => [t.uuid, t])), getColorForTagId: (id: string) => tags.find(t => t.uuid === id)?.color_hex }))
}

describe('TagSelector', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('태그 목록을 표시한다', () => {
    mockTags([{ uuid: 't1', name: '업무', color_hex: '#ff0000' }])
    render(<MemoryRouter><TagSelector value={null} onChange={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('업무')).toBeInTheDocument()
  })

  it('태그를 선택하면 onChange가 호출된다', async () => {
    const onChange = vi.fn()
    mockTags([{ uuid: 't1', name: '업무', color_hex: '#ff0000' }])
    render(<MemoryRouter><TagSelector value={null} onChange={onChange} /></MemoryRouter>)
    await userEvent.click(screen.getByText('업무'))
    expect(onChange).toHaveBeenCalled()
  })

  it('"태그 관리" 버튼 클릭 시 /tags로 이동한다', async () => {
    mockTags([])
    render(<MemoryRouter><TagSelector value={null} onChange={vi.fn()} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: '태그 관리 >' }))
    expect(mockNavigate).toHaveBeenCalled()
  })
})
