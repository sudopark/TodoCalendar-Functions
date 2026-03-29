import { useState, useMemo } from 'react'
import { buildCalendarGrid, navigateMonth } from './calendarUtils'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'

interface MonthCalendarProps {
  today?: Date
}

export default function MonthCalendar({ today = new Date() }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  const goToPrev = () => setCurrentMonth(prev => navigateMonth(prev, -1))
  const goToNext = () => setCurrentMonth(prev => navigateMonth(prev, 1))

  return (
    <div className="mx-auto max-w-md p-4">
      <CalendarHeader year={year} month={month} onPrev={goToPrev} onNext={goToNext} />
      <CalendarGrid days={days} />
    </div>
  )
}
