import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, vi } from 'vitest'
import MonthCalendar from '../../src/calendar/MonthCalendar'

// 외부 API만 모킹 — 스토어는 실제 동작
vi.mock('../../src/api/todoApi', () => ({ todoApi: { getTodos: async () => [] } }))
vi.mock('../../src/api/scheduleApi', () => ({ scheduleApi: { getSchedules: async () => [] } }))
vi.mock('../../src/api/holidayApi', () => ({ holidayApi: { getHolidays: async () => ({ items: [] }) } }))
vi.mock('../../src/api/eventTagApi', () => ({ eventTagApi: { getAllTags: async () => [] } }))

const today = new Date(2026, 2, 29) // March 29, 2026

describe('MonthCalendar', () => {
  test('현재 달의 월/연도를 헤더에 표시한다', () => {
    // given: 오늘이 2026년 3월
    // when: MonthCalendar 렌더
    render(<MonthCalendar today={today} />)

    // then: 헤더에 March 2026 표시
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  test('요일 헤더와 날짜 셀을 렌더링한다', () => {
    render(<MonthCalendar today={today} />)
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getAllByTestId('day-cell').length).toBeGreaterThan(0)
  })

  test('다음 달 버튼을 클릭하면 다음 달 캘린더로 이동한다', async () => {
    // given: 3월 캘린더
    const user = userEvent.setup()
    render(<MonthCalendar today={today} />)

    // when: 다음 달 버튼 클릭
    await user.click(screen.getByLabelText('Next month'))

    // then: 4월 캘린더로 이동
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  test('이전 달 버튼을 클릭하면 이전 달 캘린더로 이동한다', async () => {
    // given: 3월 캘린더
    const user = userEvent.setup()
    render(<MonthCalendar today={today} />)

    // when: 이전 달 버튼 클릭
    await user.click(screen.getByLabelText('Previous month'))

    // then: 2월 캘린더로 이동
    expect(screen.getByText('February 2026')).toBeInTheDocument()
  })

  test('연속으로 이동하고 되돌아올 수 있다', async () => {
    const user = userEvent.setup()
    render(<MonthCalendar today={today} />)

    await user.click(screen.getByLabelText('Next month'))
    await user.click(screen.getByLabelText('Next month'))
    expect(screen.getByText('May 2026')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Previous month'))
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  test('12월에서 다음 달로 이동하면 연도가 바뀐다', async () => {
    // given: 12월 캘린더
    const user = userEvent.setup()
    render(<MonthCalendar today={new Date(2026, 11, 15)} />)

    // when: 다음 달 버튼 클릭
    await user.click(screen.getByLabelText('Next month'))

    // then: 2027년 1월로 이동
    expect(screen.getByText('January 2027')).toBeInTheDocument()
  })
})
