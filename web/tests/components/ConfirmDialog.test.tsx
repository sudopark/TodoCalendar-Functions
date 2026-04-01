import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('제목과 메시지를 표시한다', () => {
    render(<ConfirmDialog title="삭제 확인" message="정말 삭제할까요?" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('삭제 확인')).toBeInTheDocument()
    expect(screen.getByText('정말 삭제할까요?')).toBeInTheDocument()
  })

  it('확인 버튼을 클릭하면 onConfirm이 호출된다', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog title="삭제" message="삭제?" onConfirm={onConfirm} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('취소 버튼을 클릭하면 onCancel이 호출된다', async () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog title="삭제" message="삭제?" onConfirm={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
