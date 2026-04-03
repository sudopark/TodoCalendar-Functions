import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingScopeDialog } from '../../src/components/RepeatingScopeDialog'

describe('RepeatingScopeDialog', () => {
  it('삭제 모드에서는 "반복 일정 삭제" 제목을 표시한다', () => {
    render(<RepeatingScopeDialog mode="delete" onSelect={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('반복 일정 삭제')).toBeInTheDocument()
  })

  it('수정 모드에서는 "반복 일정 수정" 제목을 표시한다', () => {
    render(<RepeatingScopeDialog mode="edit" onSelect={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('반복 일정 수정')).toBeInTheDocument()
  })

  it('"이 이벤트만" 클릭 시 onSelect가 호출된다', async () => {
    const onSelect = vi.fn()
    render(<RepeatingScopeDialog mode="delete" onSelect={onSelect} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByText('이 이벤트만'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('"이 이벤트 및 이후 이벤트" 클릭 시 onSelect가 호출된다', async () => {
    const onSelect = vi.fn()
    render(<RepeatingScopeDialog mode="delete" onSelect={onSelect} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByText('이 이벤트 및 이후 이벤트'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('"모든 이벤트" 클릭 시 onSelect가 호출된다', async () => {
    const onSelect = vi.fn()
    render(<RepeatingScopeDialog mode="edit" onSelect={onSelect} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByText('모든 이벤트'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('취소 버튼을 클릭하면 onCancel이 호출된다', async () => {
    const onCancel = vi.fn()
    render(<RepeatingScopeDialog mode="delete" onSelect={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
