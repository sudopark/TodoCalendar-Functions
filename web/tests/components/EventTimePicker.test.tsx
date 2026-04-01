import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventTimePicker } from '../../src/components/EventTimePicker'

describe('EventTimePicker', () => {
  it('required=false이고 value=null이면 "시간 없음" 옵션이 선택된다', () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} required={false} />)
    expect(screen.getByRole('radio', { name: '시간 없음' })).toBeChecked()
  })

  it('"특정 시각" 탭을 선택하면 단일 datetime 입력 필드가 표시된다', async () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: '특정 시각' }))
    expect(screen.getByLabelText('시각')).toBeInTheDocument()
  })

  it('"기간" 탭을 선택하면 시작/종료 datetime 필드가 표시된다', async () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: '기간' }))
    expect(screen.getByLabelText('시작')).toBeInTheDocument()
    expect(screen.getByLabelText('종료')).toBeInTheDocument()
  })

  it('"종일" 탭을 선택하면 날짜만 있는 시작/종료 필드가 표시된다', async () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: '종일' }))
    expect(screen.getByLabelText('시작일')).toBeInTheDocument()
    expect(screen.getByLabelText('종료일')).toBeInTheDocument()
  })

  it('기존 at 값이 있으면 "특정 시각" 타입으로 초기화된다', () => {
    const value = { time_type: 'at' as const, timestamp: 1743375600 }
    render(<EventTimePicker value={value} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '특정 시각' })).toBeChecked()
    expect(screen.getByLabelText('시각')).toBeInTheDocument()
  })

  it('기존 period 값이 있으면 "기간" 타입으로 초기화된다', () => {
    const value = { time_type: 'period' as const, period_start: 1743375600, period_end: 1743379200 }
    render(<EventTimePicker value={value} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '기간' })).toBeChecked()
  })

  it('required=true이면 "시간 없음" 옵션이 표시되지 않는다', () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} required={true} />)
    expect(screen.queryByRole('radio', { name: '시간 없음' })).not.toBeInTheDocument()
  })
})
