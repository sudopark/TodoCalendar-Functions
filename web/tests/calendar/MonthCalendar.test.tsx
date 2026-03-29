import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import MonthCalendar from '../../src/calendar/MonthCalendar'

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: vi.fn((selector: any) => {
    const state = { selectedDate: null, setSelectedDate: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/calendarEventsStore', () => ({
  useCalendarEventsStore: vi.fn((selector: any) => {
    const state = { eventsByDate: new Map(), fetchEventsForRange: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/holidayStore', () => ({
  useHolidayStore: vi.fn((selector: any) => {
    const state = { getHolidayNames: () => [], fetchHolidays: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/eventTagStore', () => ({
  useEventTagStore: vi.fn((selector: any) => {
    const state = { getColorForTagId: () => undefined }
    return selector(state)
  }),
}))

const today = new Date(2026, 2, 29) // March 29, 2026

describe('MonthCalendar', () => {
  test('현재 월 타이틀을 표시한다', () => {
    render(<MonthCalendar today={today} />)
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  test('요일 헤더와 날짜 셀을 렌더링한다', () => {
    render(<MonthCalendar today={today} />)
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getAllByTestId('day-cell').length).toBeGreaterThan(0)
  })

  test('다음 달 버튼 클릭 시 월이 변경된다', async () => {
    const user = userEvent.setup()
    render(<MonthCalendar today={today} />)

    await user.click(screen.getByLabelText('Next month'))
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  test('이전 달 버튼 클릭 시 월이 변경된다', async () => {
    const user = userEvent.setup()
    render(<MonthCalendar today={today} />)

    await user.click(screen.getByLabelText('Previous month'))
    expect(screen.getByText('February 2026')).toBeInTheDocument()
  })

  test('연속 네비게이션이 올바르게 동작한다', async () => {
    const user = userEvent.setup()
    render(<MonthCalendar today={today} />)

    await user.click(screen.getByLabelText('Next month'))
    await user.click(screen.getByLabelText('Next month'))
    expect(screen.getByText('May 2026')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Previous month'))
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  test('12월에서 다음 달로 이동하면 연도가 바뀐다', async () => {
    const user = userEvent.setup()
    const dec = new Date(2026, 11, 15)
    render(<MonthCalendar today={dec} />)

    expect(screen.getByText('December 2026')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Next month'))
    expect(screen.getByText('January 2027')).toBeInTheDocument()
  })
})
