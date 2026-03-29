import { render, screen } from '@testing-library/react'
import CalendarGrid from '../../src/calendar/CalendarGrid'
import { buildCalendarGrid } from '../../src/calendar/calendarUtils'

const today = new Date(2026, 2, 29) // March 29, 2026 (Sunday)
const marchDays = buildCalendarGrid(2026, 2, today)

describe('CalendarGrid', () => {
  test('7개의 요일 헤더를 렌더링한다', () => {
    render(<CalendarGrid days={marchDays} />)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    weekdays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  test('올바른 수의 날짜 셀을 렌더링한다', () => {
    render(<CalendarGrid days={marchDays} />)
    const cells = screen.getAllByTestId('day-cell')
    expect(cells.length).toBe(marchDays.length)
  })

  test('오늘 날짜 셀에 하이라이트 클래스가 적용된다', () => {
    render(<CalendarGrid days={marchDays} />)
    const cells = screen.getAllByTestId('day-cell')
    const todayCell = cells.find(cell => cell.classList.contains('bg-blue-500'))
    expect(todayCell).toBeDefined()
    expect(todayCell!.textContent).toBe('29')
  })

  test('이전/다음 달 날짜에 흐린 스타일이 적용된다', () => {
    render(<CalendarGrid days={marchDays} />)
    const cells = screen.getAllByTestId('day-cell')
    // 첫 셀은 2월(이전 달)이므로 text-gray-300
    expect(cells[0].classList.contains('text-gray-300')).toBe(true)
  })

  test('이번 달 날짜에 기본 스타일이 적용된다', () => {
    render(<CalendarGrid days={marchDays} />)
    const cells = screen.getAllByTestId('day-cell')
    // 8번째 셀은 3월 1일 (March 1 is Sunday, but first row is Feb last week)
    const march1Index = marchDays.findIndex(d => d.isCurrentMonth)
    expect(cells[march1Index].classList.contains('text-gray-900')).toBe(true)
  })
})
