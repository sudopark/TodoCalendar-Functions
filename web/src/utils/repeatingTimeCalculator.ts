import type { EventTime, Repeating, RepeatingOption } from '../models'
import type {
  EveryMonthDaysSelection,
  EveryMonthWeekSelection,
  WeekOrdinal,
} from '../models'

export interface RepeatingTimes {
  time: EventTime
  turn: number
}

// --- public API ---

export function nextRepeatingTime(
  currentTime: EventTime,
  currentTurn: number,
  repeating: Repeating,
  excludeTurns?: number[],
): RepeatingTimes | null {
  const nextTurn = currentTurn + 1
  const intervalSeconds = computeIntervalSeconds(currentTime, repeating.option)
  if (intervalSeconds === null) return null

  const nextTime = shiftEventTime(currentTime, intervalSeconds)

  // end 조건 확인
  if (repeating.end != null) {
    const ts = getStartTimestamp(nextTime)
    if (ts > repeating.end) return null
  }
  if (repeating.end_count != null && nextTurn > repeating.end_count) return null

  // 제외 턴이면 반복문으로 다음 계산
  let result: RepeatingTimes = { time: nextTime, turn: nextTurn }
  while (excludeTurns?.includes(result.turn)) {
    const nextInterval = computeIntervalSeconds(result.time, repeating.option)
    if (nextInterval === null) return null
    const skippedTime = shiftEventTime(result.time, nextInterval)
    const skippedTurn = result.turn + 1
    if (repeating.end != null) {
      const ts = getStartTimestamp(skippedTime)
      if (ts > repeating.end) return null
    }
    if (repeating.end_count != null && skippedTurn > repeating.end_count) return null
    result = { time: skippedTime, turn: skippedTurn }
  }

  return result
}

export function shiftEventTime(time: EventTime, intervalSeconds: number): EventTime {
  switch (time.time_type) {
    case 'at':
      return { time_type: 'at', timestamp: time.timestamp + intervalSeconds }
    case 'period':
      return { time_type: 'period', period_start: time.period_start + intervalSeconds, period_end: time.period_end + intervalSeconds }
    case 'allday':
      return { time_type: 'allday', period_start: time.period_start + intervalSeconds, period_end: time.period_end + intervalSeconds, seconds_from_gmt: time.seconds_from_gmt }
  }
}

export function getStartTimestamp(time: EventTime): number {
  return time.time_type === 'at' ? time.timestamp : time.period_start
}

// --- internal helpers ---

function dateToDayOfWeek(date: Date): number {
  // Sunday=0, Monday=1, ..., Saturday=6 (JS getDay convention)
  return date.getDay()
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  // weekday: 0(Sun)~6(Sat) (JS getDay convention), nth: 1-based
  const firstDay = new Date(year, month - 1, 1)
  let firstOccurrence = firstDay.getDate() + ((weekday - firstDay.getDay() + 7) % 7)
  const targetDate = firstOccurrence + (nth - 1) * 7
  if (targetDate > daysInMonth(year, month)) return null
  return new Date(year, month - 1, targetDate)
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  // weekday: 0(Sun)~6(Sat) (JS getDay convention)
  const lastDay = new Date(year, month, 0)
  const diff = (lastDay.getDay() - weekday + 7) % 7
  return new Date(year, month - 1, lastDay.getDate() - diff)
}

function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function timestampToDate(ts: number): Date {
  return new Date(ts * 1000)
}

// --- interval computation per option ---

function computeIntervalSeconds(currentTime: EventTime, option: RepeatingOption): number | null {
  const startTs = getStartTimestamp(currentTime)
  const currentDate = timestampToDate(startTs)

  switch (option.optionType) {
    case 'every_day':
      return everyDayInterval(currentDate, startTs, option.interval)
    case 'every_week':
      return everyWeekInterval(currentDate, startTs, option.interval, option.dayOfWeek)
    case 'every_month':
      return everyMonthInterval(currentDate, startTs, option.interval, option.monthDaySelection)
    case 'every_year':
      return everyYearInterval(currentDate, startTs, option.interval, option.months, option.weekOrdinals, option.dayOfWeek)
    case 'every_year_some_day':
      return everyYearSomeDayInterval(currentDate, startTs, option.interval)
    case 'lunar_calendar_every_year':
      // TODO: 정확한 음력 변환 필요 — 현재는 양력 기준 1년 후로 근사 처리
      return everyYearSomeDayInterval(currentDate, startTs, 1)
  }
}

// 1. every_day — Date 날짜 연산으로 DST 안전 처리
function everyDayInterval(currentDate: Date, currentTs: number, interval: number): number {
  const nextDate = new Date(currentDate)
  nextDate.setDate(nextDate.getDate() + interval)
  return dateToTimestamp(nextDate) - currentTs
}

// 2. every_week — Date 날짜 연산으로 DST 안전 처리
function everyWeekInterval(currentDate: Date, currentTs: number, interval: number, dayOfWeeks: number[]): number {
  if (dayOfWeeks.length === 0) {
    const nextDate = new Date(currentDate)
    nextDate.setDate(nextDate.getDate() + interval * 7)
    return dateToTimestamp(nextDate) - currentTs
  }

  const currentDow = dateToDayOfWeek(currentDate)
  const sorted = [...dayOfWeeks].sort((a, b) => a - b)

  // 같은 주에서 현재 요일보다 큰 다음 요일 찾기
  const nextInWeek = sorted.find(d => d > currentDow)
  if (nextInWeek !== undefined) {
    const daysToAdd = nextInWeek - currentDow
    const nextDate = new Date(currentDate)
    nextDate.setDate(nextDate.getDate() + daysToAdd)
    return dateToTimestamp(nextDate) - currentTs
  }

  // 없으면 interval주 후의 첫 번째 선택된 요일
  const daysToEndOfWeek = 7 - currentDow
  const additionalWeeks = (interval - 1) * 7
  const daysToFirst = sorted[0]
  const totalDays = daysToEndOfWeek + additionalWeeks + daysToFirst
  const nextDate = new Date(currentDate)
  nextDate.setDate(nextDate.getDate() + totalDays)
  return dateToTimestamp(nextDate) - currentTs
}

// 3. every_month
function everyMonthInterval(
  currentDate: Date,
  currentTs: number,
  interval: number,
  selection: import('../models').MonthDaySelection,
): number | null {
  if ('days' in selection) {
    return everyMonthDaysInterval(currentDate, currentTs, interval, selection as EveryMonthDaysSelection)
  }
  return everyMonthWeekInterval(currentDate, currentTs, interval, selection as EveryMonthWeekSelection)
}

// 3a. every_month (days mode)
function everyMonthDaysInterval(
  currentDate: Date,
  currentTs: number,
  interval: number,
  selection: EveryMonthDaysSelection,
): number | null {
  const currentDay = currentDate.getDate()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // 1-based
  const sorted = [...selection.days].sort((a, b) => a - b)

  // 같은 달에서 현재 day보다 큰 day 찾기 (해당 날이 실제 존재해야 함)
  const maxDay = daysInMonth(currentYear, currentMonth)
  const nextInMonth = sorted.find(d => d > currentDay && d <= maxDay)
  if (nextInMonth !== undefined) {
    const target = new Date(currentYear, currentMonth - 1, nextInMonth,
      currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds())
    return dateToTimestamp(target) - currentTs
  }

  // interval개월 후부터 유효한 day 찾기
  let targetMonth = currentMonth + interval
  let targetYear = currentYear
  while (targetMonth > 12) { targetMonth -= 12; targetYear++ }

  for (let attempt = 0; attempt < 24; attempt++) {
    const maxDayTarget = daysInMonth(targetYear, targetMonth)
    const validDay = sorted.find(d => d <= maxDayTarget)
    if (validDay !== undefined) {
      const target = new Date(targetYear, targetMonth - 1, validDay,
        currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds())
      return dateToTimestamp(target) - currentTs
    }
    targetMonth += interval
    while (targetMonth > 12) { targetMonth -= 12; targetYear++ }
  }

  return null
}

// 3b. every_month (week mode)
function everyMonthWeekInterval(
  currentDate: Date,
  currentTs: number,
  interval: number,
  selection: EveryMonthWeekSelection,
): number | null {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  // 같은 달에서 현재 날짜 이후의 매칭 날짜 찾기
  const candidates = findWeekSelectionDates(currentYear, currentMonth, selection)
    .map(d => { preserveTime(d, currentDate); return d })
  const nextInMonth = candidates.find(d => dateToTimestamp(d) > currentTs)
  if (nextInMonth) {
    return dateToTimestamp(nextInMonth) - currentTs
  }

  // interval개월 후
  let targetMonth = currentMonth + interval
  let targetYear = currentYear
  while (targetMonth > 12) { targetMonth -= 12; targetYear++ }

  for (let attempt = 0; attempt < 24; attempt++) {
    const futureCandidates = findWeekSelectionDates(targetYear, targetMonth, selection)
      .map(d => { preserveTime(d, currentDate); return d })
    if (futureCandidates.length > 0) {
      const target = futureCandidates[0]
      return dateToTimestamp(target) - currentTs
    }
    targetMonth += interval
    while (targetMonth > 12) { targetMonth -= 12; targetYear++ }
  }

  return null
}

// 4. every_year (months + weekOrdinals + dayOfWeek)
function everyYearInterval(
  currentDate: Date,
  currentTs: number,
  interval: number,
  months: number[],
  weekOrdinals: WeekOrdinal[],
  dayOfWeeks: number[],
): number | null {
  const currentYear = currentDate.getFullYear()
  const sortedMonths = [...months].sort((a, b) => a - b)

  // 같은 해에서 현재 이후 찾기
  for (const month of sortedMonths) {
    const candidates = findYearWeekDates(currentYear, month, weekOrdinals, dayOfWeeks)
      .map(d => { preserveTime(d, currentDate); return d })
    const next = candidates.find(d => dateToTimestamp(d) > currentTs)
    if (next) {
      return dateToTimestamp(next) - currentTs
    }
  }

  // interval년 후
  let targetYear = currentYear + interval
  for (let attempt = 0; attempt < 10; attempt++) {
    for (const month of sortedMonths) {
      const candidates = findYearWeekDates(targetYear, month, weekOrdinals, dayOfWeeks)
        .map(d => { preserveTime(d, currentDate); return d })
      if (candidates.length > 0) {
        const target = candidates[0]
        return dateToTimestamp(target) - currentTs
      }
    }
    targetYear += interval
  }

  return null
}

// 5. every_year_some_day
function everyYearSomeDayInterval(
  currentDate: Date,
  currentTs: number,
  interval: number,
): number | null {
  const targetDate = new Date(currentDate)
  targetDate.setFullYear(targetDate.getFullYear() + interval)
  return dateToTimestamp(targetDate) - currentTs
}

// --- week selection helpers ---

function findWeekSelectionDates(year: number, month: number, selection: EveryMonthWeekSelection): Date[] {
  const results: Date[] = []
  for (const ordinal of selection.weekOrdinals) {
    for (const weekday of selection.weekDays) {
      const d = resolveWeekOrdinalDate(year, month, weekday, ordinal)
      if (d) results.push(d)
    }
  }
  return results.sort((a, b) => a.getTime() - b.getTime())
}

function findYearWeekDates(year: number, month: number, weekOrdinals: WeekOrdinal[], dayOfWeeks: number[]): Date[] {
  const results: Date[] = []
  for (const ordinal of weekOrdinals) {
    for (const weekday of dayOfWeeks) {
      const d = resolveWeekOrdinalDate(year, month, weekday, ordinal)
      if (d) results.push(d)
    }
  }
  return results.sort((a, b) => a.getTime() - b.getTime())
}

function resolveWeekOrdinalDate(year: number, month: number, weekday: number, ordinal: WeekOrdinal): Date | null {
  if (ordinal.isLast) {
    return lastWeekdayOfMonth(year, month, weekday)
  }
  if (ordinal.seq != null) {
    return nthWeekdayOfMonth(year, month, weekday, ordinal.seq)
  }
  return null
}

function preserveTime(target: Date, source: Date): void {
  target.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds())
}
