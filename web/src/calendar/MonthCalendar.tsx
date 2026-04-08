import { useState, useMemo, useEffect } from 'react'
import { buildCalendarGrid, navigateMonth } from './calendarUtils'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { TagFilter } from '../components/TagFilter'
import { dayRange } from '../utils/eventTimeUtils'

interface MonthCalendarProps {
  today?: Date
}

export default function MonthCalendar({ today: todayProp }: MonthCalendarProps) {
  const todayKey = todayProp
    ? `${todayProp.getFullYear()}-${todayProp.getMonth()}-${todayProp.getDate()}`
    : ''
  const today = useMemo(() => {
    if (!todayProp) return new Date()
    return new Date(todayProp.getFullYear(), todayProp.getMonth(), todayProp.getDate())
  }, [todayKey]) // todayProp 레퍼런스가 아닌 날짜값만 의존
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const fetchEventsForRange = useCalendarEventsStore(s => s.fetchEventsForRange)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  useEffect(() => {
    if (days.length === 0) return
    const lower = dayRange(days[0].date).lower
    const upper = dayRange(days[days.length - 1].date).upper
    fetchEventsForRange(lower, upper)
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchEventsForRange, fetchHolidays])

  const goToPrev = () => setCurrentMonth(prev => navigateMonth(prev, -1))
  const goToNext = () => setCurrentMonth(prev => navigateMonth(prev, 1))

  return (
    <div className="mx-auto max-w-md p-4">
      <CalendarHeader year={year} month={month} onPrev={goToPrev} onNext={goToNext} />
      <CalendarGrid days={days} />
      <TagFilter />
    </div>
  )
}
