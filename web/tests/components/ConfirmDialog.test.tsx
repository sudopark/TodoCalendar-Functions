import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('제목과 메시지를 표시한다', () => {
    // given / when
    render(
      <ConfirmDialog title="삭제 확인" message="정말 삭제할까요?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    // then
    expect(screen.getByText('삭제 확인')).toBeInTheDocument()
    expect(screen.getByText('정말 삭제할까요?')).toBeInTheDocument()
  })

  it('메시지만으로도 렌더 가능하다', () => {
    // given / when
    render(
      <ConfirmDialog message="정말 삭제할까요?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    // then
    expect(screen.getByText('정말 삭제할까요?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
  })

  it('확인 버튼 클릭 시 onConfirm이 호출된다', async () => {
    // given
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog message="삭제?" onConfirm={onConfirm} onCancel={vi.fn()} />
    )

    // when
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    expect(onConfirm).toHaveBeenCalled()
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', async () => {
    // given
    const onCancel = vi.fn()
    render(
      <ConfirmDialog message="삭제?" onConfirm={vi.fn()} onCancel={onCancel} />
    )

    // when
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then
    expect(onCancel).toHaveBeenCalled()
  })

  it('danger 플래그가 있으면 확인 버튼에 red 스타일이 적용된다', () => {
    // given / when
    render(
      <ConfirmDialog message="삭제?" onConfirm={vi.fn()} onCancel={vi.fn()} danger />
    )

    // then
    expect(screen.getByRole('button', { name: '확인' })).toHaveClass('bg-red-500')
  })

  it('danger=false이면 blue 스타일이 적용된다', () => {
    // given / when
    render(
      <ConfirmDialog message="확인?" onConfirm={vi.fn()} onCancel={vi.fn()} danger={false} />
    )

    // then
    expect(screen.getByRole('button', { name: '확인' })).toHaveClass('bg-blue-500')
  })

  it('confirmLabel로 버튼 텍스트를 변경할 수 있다', () => {
    // given / when
    render(
      <ConfirmDialog title="삭제" message="삭제?" confirmLabel="삭제" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    // then
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })
})
