import type { CalendarDay } from './calendarUtils'
import { formatDateKey } from '../utils/eventTimeUtils'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarGridProps {
  days: CalendarDay[]
}

export default function CalendarGrid({ days }: CalendarGridProps) {
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const isTagHidden = useTagFilterStore(s => s.isTagHidden)

  return (
    <div className="grid grid-cols-7">
      {WEEKDAYS.map((day, i) => (
        <div
          key={day}
          className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {day}
        </div>
      ))}
      {days.map((day, i) => {
        const isSelected = selectedDate && formatDateKey(selectedDate) === day.dateKey
        const holidayNames = getHolidayNames(day.dateKey)
        const isHoliday = holidayNames.length > 0
        const isSunday = day.date.getDay() === 0

        const events = (eventsByDate.get(day.dateKey) ?? []).filter(ev => !isTagHidden(ev.event.event_tag_id))
        const dotColors: string[] = []
        for (const ev of events.slice(0, 3)) {
          const tagId = ev.event.event_tag_id
          const color = tagId ? getColorForTagId(tagId) : undefined
          dotColors.push(color ?? '#9ca3af')
        }

        const textColor = day.isToday
          ? 'font-semibold text-white'
          : !day.isCurrentMonth
            ? 'text-gray-300 dark:text-gray-600'
            : (isHoliday || isSunday)
              ? 'text-red-500'
              : 'text-gray-900 dark:text-gray-100'

        const bgClass = day.isToday ? 'bg-blue-500 rounded-full' : ''
        const selectedClass = isSelected && !day.isToday ? 'ring-2 ring-blue-400 rounded-full' : ''

        return (
          <div
            key={i}
            className="flex flex-col items-center py-1 cursor-pointer"
            data-testid="day-cell"
            onClick={() => setSelectedDate(day.date)}
            title={holidayNames.join(', ') || undefined}
          >
            <div className={`flex h-7 w-7 items-center justify-center text-sm ${textColor} ${bgClass} ${selectedClass}`}>
              {day.dayOfMonth}
            </div>
            {dotColors.length > 0 && (
              <div className="mt-0.5 flex gap-0.5" data-testid="event-dots">
                {dotColors.map((color, j) => (
                  <span
                    key={j}
                    className="inline-block h-1 w-1 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
