import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPalette } from '../../src/components/ColorPalette'

const COLORS = ['#ef4444', '#3b82f6', '#22c55e']

describe('ColorPalette', () => {
  it('전달된 색상 버튼을 렌더한다', () => {
    // given / when
    render(<ColorPalette colors={COLORS} selected="#ef4444" onChange={vi.fn()} />)

    // then: 각 색상마다 버튼이 존재
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('색상 버튼 클릭 시 onChange가 호출된다', async () => {
    // given
    const onChange = vi.fn()
    render(<ColorPalette colors={COLORS} selected="#ef4444" onChange={onChange} />)

    // when: 두 번째 버튼(#3b82f6) 클릭
    await userEvent.click(screen.getAllByRole('button')[1])

    // then
    expect(onChange).toHaveBeenCalled()
  })

  it('selected 색상 버튼에 강조 테두리 클래스가 적용된다', () => {
    // given / when
    render(<ColorPalette colors={COLORS} selected="#3b82f6" onChange={vi.fn()} />)

    // then
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toHaveClass('border-gray-800')
    expect(buttons[0]).not.toHaveClass('border-gray-800')
  })
})
