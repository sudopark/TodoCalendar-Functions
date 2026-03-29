import { buildCalendarGrid, navigateMonth, formatMonthTitle } from '../../src/calendar/calendarUtils'

describe('buildCalendarGrid', () => {
  const today = new Date(2026, 2, 29) // March 29, 2026

  test('항상 7의 배수 셀을 생성한다', () => {
    for (let m = 0; m < 12; m++) {
      const days = buildCalendarGrid(2026, m, today)
      expect(days.length % 7).toBe(0)
    }
  })

  test('해당 월의 모든 날을 포함한다', () => {
    const days = buildCalendarGrid(2026, 2, today) // March 2026
    const marchDays = days.filter(d => d.isCurrentMonth)
    expect(marchDays.length).toBe(31)
    expect(marchDays[0].dayOfMonth).toBe(1)
    expect(marchDays[marchDays.length - 1].dayOfMonth).toBe(31)
  })

  test('그리드 첫 셀은 일요일이다', () => {
    for (let m = 0; m < 12; m++) {
      const days = buildCalendarGrid(2026, m, today)
      expect(days[0].date.getDay()).toBe(0) // Sunday
    }
  })

  test('그리드 마지막 셀은 토요일이다', () => {
    for (let m = 0; m < 12; m++) {
      const days = buildCalendarGrid(2026, m, today)
      expect(days[days.length - 1].date.getDay()).toBe(6) // Saturday
    }
  })

  // March 2026: 1일이 일요일 → 이전 달 마지막 주 1행 추가
  test('첫째 날이 일요일이면 이전 달 마지막 주를 추가로 표시한다', () => {
    const days = buildCalendarGrid(2026, 2, today) // March 1 = Sunday
    // 첫 행은 2월 마지막 주 (Feb 22-28)
    expect(days[0].isCurrentMonth).toBe(false)
    expect(days[0].date.getMonth()).toBe(1) // February
    expect(days[0].dayOfMonth).toBe(22)
    // 둘째 행 일요일부터 3월
    expect(days[7].isCurrentMonth).toBe(true)
    expect(days[7].dayOfMonth).toBe(1)
  })

  // April 2026: 1일이 수요일 → 첫 행에 3월 말이 섞여있음, 추가 행 없음
  test('첫째 날이 주 중간이면 같은 행에 이전 달이 섞인다', () => {
    const days = buildCalendarGrid(2026, 3, today) // April 1 = Wednesday
    // 첫 행: 3/29(Sun), 3/30(Mon), 3/31(Tue), 4/1(Wed)...
    expect(days[0].isCurrentMonth).toBe(false)
    expect(days[3].isCurrentMonth).toBe(true)
    expect(days[3].dayOfMonth).toBe(1)
  })

  // March 2026: 31일이 화요일 → 마지막 행에 4월이 섞임
  test('마지막 날이 주 중간이면 같은 행에 다음 달이 섞인다', () => {
    const days = buildCalendarGrid(2026, 2, today)
    const lastDay = days[days.length - 1]
    expect(lastDay.isCurrentMonth).toBe(false)
    expect(lastDay.date.getDay()).toBe(6) // Saturday
  })

  // May 2026: 31일이 일요일... 아니 확인하자
  // May 2026: 1일이 금요일 → 31일이 일요일
  // 실제: May 1 2026 = Friday
  // May 31 2026 = Sunday... no. Let me calculate.
  // Actually let's use a month where last day is Saturday
  // January 2022: 31일이 Monday. Not useful.
  // Let's just test October 2026: Oct 31 = Saturday
  test('마지막 날이 토요일이면 다음 달 첫 주를 추가로 표시한다', () => {
    const days = buildCalendarGrid(2026, 9, today) // October 2026, Oct 31 = Saturday
    const lastWeek = days.slice(-7)
    // 마지막 행은 전부 다음 달(11월)이어야 함
    expect(lastWeek.every(d => !d.isCurrentMonth)).toBe(true)
    expect(lastWeek[0].date.getMonth()).toBe(10) // November
  })

  test('isToday는 오늘 날짜 셀에만 true이다', () => {
    const days = buildCalendarGrid(2026, 2, today)
    const todayCells = days.filter(d => d.isToday)
    expect(todayCells.length).toBe(1)
    expect(todayCells[0].dayOfMonth).toBe(29)
    expect(todayCells[0].isCurrentMonth).toBe(true)
  })

  test('다른 월 조회 시 isToday가 모두 false이다', () => {
    const days = buildCalendarGrid(2026, 0, today) // January
    expect(days.every(d => !d.isToday)).toBe(true)
  })

  test('February 2024 윤년을 올바르게 처리한다', () => {
    const days = buildCalendarGrid(2024, 1, today)
    const febDays = days.filter(d => d.isCurrentMonth)
    expect(febDays.length).toBe(29)
  })

  test('February 2026 평년을 올바르게 처리한다', () => {
    const days = buildCalendarGrid(2026, 1, today)
    const febDays = days.filter(d => d.isCurrentMonth)
    expect(febDays.length).toBe(28)
  })
})

describe('navigateMonth', () => {
  test('다음 달로 이동한다', () => {
    const result = navigateMonth(new Date(2026, 2, 15), 1)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April
  })

  test('이전 달로 이동한다', () => {
    const result = navigateMonth(new Date(2026, 2, 15), -1)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(1) // February
  })

  test('12월 → 1월 연도 롤오버를 처리한다', () => {
    const result = navigateMonth(new Date(2026, 11, 1), 1)
    expect(result.getFullYear()).toBe(2027)
    expect(result.getMonth()).toBe(0)
  })

  test('1월 → 12월 연도 롤오버를 처리한다', () => {
    const result = navigateMonth(new Date(2026, 0, 1), -1)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(11)
  })
})

describe('formatMonthTitle', () => {
  test('월과 연도를 포맷한다', () => {
    expect(formatMonthTitle(2026, 2)).toBe('March 2026')
  })

  test('1월을 올바르게 포맷한다', () => {
    expect(formatMonthTitle(2026, 0)).toBe('January 2026')
  })

  test('12월을 올바르게 포맷한다', () => {
    expect(formatMonthTitle(2026, 11)).toBe('December 2026')
  })
})
