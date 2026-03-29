export interface CalendarDay {
  date: Date
  dayOfMonth: number
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/**
 * 월간 달력 그리드를 생성한다.
 *
 * 규칙:
 * - 해당 월의 모든 날이 포함된 주를 표시
 * - 위/아래로 이전·다음 달과 겹치는 주가 최대 1주씩 추가
 *   (첫째 날이 일요일이면 위에 이전 달 마지막 주 1행 추가,
 *    마지막 날이 토요일이면 아래에 다음 달 첫 주 1행 추가)
 */
import { formatDateKey } from '../utils/eventTimeUtils'

export function buildCalendarGrid(year: number, month: number, today: Date): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)

  const firstDayOfWeek = firstOfMonth.getDay() // 0=Sun
  const lastDayOfWeek = lastOfMonth.getDay()   // 6=Sat

  // 그리드 시작일: 첫째 주의 일요일
  // 첫째 날이 일요일이면 이전 달 마지막 주를 추가로 보여줌
  const startOffset = firstDayOfWeek === 0 ? 7 : firstDayOfWeek
  const gridStart = new Date(year, month, 1 - startOffset)

  // 그리드 종료일: 마지막 주의 토요일
  // 마지막 날이 토요일이면 다음 달 첫 주를 추가로 보여줌
  const endOffset = lastDayOfWeek === 6 ? 7 : (6 - lastDayOfWeek)
  const gridEnd = new Date(year, month + 1, lastOfMonth.getDate() - lastOfMonth.getDate() + endOffset)

  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const days: CalendarDay[] = []

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    days.push({
      date,
      dayOfMonth: date.getDate(),
      dateKey: formatDateKey(date),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: isSameDay(date, today),
    })
  }

  return days
}

export function navigateMonth(current: Date, delta: -1 | 1): Date {
  return new Date(current.getFullYear(), current.getMonth() + delta, 1)
}

export function formatMonthTitle(year: number, month: number): string {
  const date = new Date(year, month, 1)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}
