import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { formatDateKey } from '../utils/eventTimeUtils'
import { EventTimeDisplay } from './EventTimeDisplay'
import type { CalendarEvent } from '../utils/eventTimeUtils'

function EventItem({ calEvent, onNavigate }: { calEvent: CalendarEvent; onNavigate: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const [menuOpen, setMenuOpen] = useState(false)

  const { uuid, name, event_tag_id, event_time } = calEvent.type === 'todo'
    ? { ...calEvent.event, event_time: calEvent.event.event_time ?? undefined }
    : { ...calEvent.event, event_time: calEvent.event.event_time }

  const color = event_tag_id ? (getColorForTagId(event_tag_id) ?? '#9ca3af') : '#9ca3af'
  const editPath = calEvent.type === 'todo' ? `/todos/${uuid}/edit` : `/schedules/${uuid}/edit`

  return (
    <div className="relative flex w-full items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50">
      <button className="flex flex-1 items-start gap-3 text-left" onClick={onNavigate}>
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
      <button
        aria-label="메뉴"
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100"
        onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
      >
        ···
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-8 z-20 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <button
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => { setMenuOpen(false); navigate(editPath, { state: { background: location } }) }}
            >
              수정
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface DayEventListProps {
  selectedDate: Date | null
}

export function DayEventList({ selectedDate }: DayEventListProps) {
  const navigate = useNavigate()
  const location = useLocation()
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
          <EventItem
            calEvent={calEvent}
            onNavigate={() => navigate(`/events/${calEvent.event.uuid}?type=${calEvent.type}`, {
              state: { background: location, eventType: calEvent.type },
            })}
          />
        </li>
      ))}
    </ul>
  )
}
