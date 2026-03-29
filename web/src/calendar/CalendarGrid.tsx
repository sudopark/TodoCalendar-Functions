import type { CalendarDay } from './calendarUtils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarGridProps {
  days: CalendarDay[]
}

export default function CalendarGrid({ days }: CalendarGridProps) {
  return (
    <div className="grid grid-cols-7">
      {WEEKDAYS.map(day => (
        <div
          key={day}
          className="py-2 text-center text-xs font-medium text-gray-500"
        >
          {day}
        </div>
      ))}
      {days.map((day, i) => {
        const baseClass = 'flex aspect-square items-center justify-center text-sm'
        const colorClass = day.isToday
          ? 'rounded-full bg-blue-500 font-semibold text-white'
          : day.isCurrentMonth
            ? 'text-gray-900'
            : 'text-gray-300'

        return (
          <div key={i} className={`${baseClass} ${colorClass}`} data-testid="day-cell">
            {day.dayOfMonth}
          </div>
        )
      })}
    </div>
  )
}
