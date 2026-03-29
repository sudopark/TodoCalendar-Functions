// web/src/calendar/MonthCalendar.tsx
import { useState, useMemo, useEffect } from 'react'
import { buildCalendarGrid, navigateMonth } from './calendarUtils'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { monthRange } from '../utils/eventTimeUtils'

interface MonthCalendarProps {
  today?: Date
}

export default function MonthCalendar({ today = new Date() }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const fetchEventsForRange = useCalendarEventsStore(s => s.fetchEventsForRange)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  useEffect(() => {
    const range = monthRange(year, month)
    fetchEventsForRange(range.lower, range.upper)
    fetchHolidays(year)
  }, [year, month, fetchEventsForRange, fetchHolidays])

  const goToPrev = () => setCurrentMonth(prev => navigateMonth(prev, -1))
  const goToNext = () => setCurrentMonth(prev => navigateMonth(prev, 1))

  return (
    <div className="mx-auto max-w-md p-4">
      <CalendarHeader year={year} month={month} onPrev={goToPrev} onNext={goToNext} />
      <CalendarGrid days={days} />
    </div>
  )
}
