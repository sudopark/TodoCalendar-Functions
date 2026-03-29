import { useNavigate } from 'react-router-dom'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { formatDateKey } from '../utils/eventTimeUtils'
import { EventTimeDisplay } from './EventTimeDisplay'
import type { CalendarEvent } from '../utils/eventTimeUtils'

function EventItem({ calEvent }: { calEvent: CalendarEvent }) {
  const navigate = useNavigate()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)

  const { uuid, name, event_tag_id, event_time } = calEvent.type === 'todo'
    ? { ...calEvent.event, event_time: calEvent.event.event_time ?? undefined }
    : { ...calEvent.event, event_time: calEvent.event.event_time }

  const color = event_tag_id ? (getColorForTagId(event_tag_id) ?? '#9ca3af') : '#9ca3af'

  return (
    <button
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
      onClick={() => navigate(`/events/${uuid}`)}
    >
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
        {event_time && (
          <p className="text-xs text-gray-500">
            <EventTimeDisplay eventTime={event_time} />
          </p>
        )}
      </div>
    </button>
  )
}

export function DayEventList() {
  const selectedDate = useUiStore(s => s.selectedDate)
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)

  if (!selectedDate) return null

  const dateKey = formatDateKey(selectedDate)
  const allEvents = eventsByDate.get(dateKey) ?? []

  const todos = allEvents.filter(e => e.type === 'todo')
  const schedules = allEvents.filter(e => e.type === 'schedule')
  const sorted = [...todos, ...schedules]

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        이벤트가 없습니다
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map(calEvent => (
        <li key={calEvent.event.uuid}>
          <EventItem calEvent={calEvent} />
        </li>
      ))}
    </ul>
  )
}
