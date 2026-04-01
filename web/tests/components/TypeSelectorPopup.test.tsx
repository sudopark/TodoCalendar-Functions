import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypeSelectorPopup } from '../../src/components/TypeSelectorPopup'

describe('TypeSelectorPopup', () => {
  it('Todo와 Schedule 선택지를 표시한다', () => {
    render(<TypeSelectorPopup onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
  })

  it('Todo 클릭 시 onSelect("todo")가 호출된다', async () => {
    const onSelect = vi.fn()
    render(<TypeSelectorPopup onSelect={onSelect} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Todo'))
    expect(onSelect).toHaveBeenCalledWith('todo')
  })

  it('Schedule 클릭 시 onSelect("schedule")가 호출된다', async () => {
    const onSelect = vi.fn()
    render(<TypeSelectorPopup onSelect={onSelect} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Schedule'))
    expect(onSelect).toHaveBeenCalledWith('schedule')
  })

  it('배경 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    render(<TypeSelectorPopup onSelect={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByTestId('popup-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
