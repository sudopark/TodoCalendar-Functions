import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingPicker } from '../../src/components/RepeatingPicker'

describe('RepeatingPicker', () => {
  it('기본값은 반복 없음이다', () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('checkbox', { name: '반복' })).not.toBeChecked()
  })

  it('반복 토글 ON 시 기본 타입 "매일" 옵션이 표시된다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '반복' }))
    expect(screen.getByRole('combobox', { name: '반복 유형' })).toBeInTheDocument()
  })

  it('"매주" 선택 시 요일 체크박스가 표시된다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '반복' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '반복 유형' }), 'every_week')
    expect(screen.getByText('월')).toBeInTheDocument()
  })

  it('"매월" 선택 시 날짜/요일 선택 라디오가 표시된다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '반복' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '반복 유형' }), 'every_month')
    expect(screen.getByRole('radio', { name: '날짜 지정' })).toBeInTheDocument()
  })

  it('기존 반복 값이 있으면 반복 토글이 ON 상태로 초기화된다', () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('checkbox', { name: '반복' })).toBeChecked()
  })
})
