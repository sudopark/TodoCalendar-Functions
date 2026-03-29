import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useEventTagStore } from '../stores/eventTagStore'
import { EventTimeDisplay } from '../components/EventTimeDisplay'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { EventDetail } from '../models/EventDetail'
import type { Repeating } from '../models/Repeating'

type EventItem = Todo | Schedule

function repeatingLabel(repeating: Repeating): string {
  const { option } = repeating
  switch (option.optionType) {
    case 'every_day': return `매 ${option.interval}일`
    case 'every_week': return `매 ${option.interval}주`
    case 'every_month': return `매 ${option.interval}개월`
    case 'every_year': return `매 ${option.interval}년`
    case 'every_year_some_day': return `매년`
    case 'lunar_calendar_every_year': return `매년 (음력)`
  }
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)

  const [event, setEvent] = useState<EventItem | null>(null)
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return

    async function load() {
      setLoading(true)
      try {
        // Try todo first, then schedule
        let item: EventItem | null = null
        try {
          item = await todoApi.getTodo(id!)
        } catch {
          item = await scheduleApi.getSchedule(id!)
        }
        setEvent(item)

        try {
          const d = await eventDetailApi.getEventDetail(id!)
          setDetail(d)
        } catch {
          // detail is optional
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">이벤트를 찾을 수 없습니다</p>
        <button className="text-blue-500 text-sm" onClick={() => navigate(-1)}>돌아가기</button>
      </div>
    )
  }

  const tagColor = event.event_tag_id ? (getColorForTagId(event.event_tag_id) ?? '#9ca3af') : null
  const eventTime = 'event_time' in event ? event.event_time : undefined
  const repeating = event.repeating

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <button
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        onClick={() => navigate(-1)}
      >
        ← 뒤로
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start gap-3">
          {tagColor && (
            <span
              className="mt-1 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: tagColor }}
            />
          )}
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
        </div>

        {/* Time */}
        {eventTime && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">시간</p>
            <p className="mt-1 text-sm text-gray-700">
              <EventTimeDisplay eventTime={eventTime} />
            </p>
          </div>
        )}

        {/* Repeating */}
        {repeating && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">반복</p>
            <p className="mt-1 text-sm text-gray-700">{repeatingLabel(repeating)}</p>
          </div>
        )}

        {/* EventDetail */}
        {detail && (detail.place || detail.url || detail.memo) && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {detail.place && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">장소</p>
                <p className="mt-1 text-sm text-gray-700">{detail.place}</p>
              </div>
            )}
            {detail.url && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">URL</p>
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm text-blue-500 underline break-all"
                >
                  {detail.url}
                </a>
              </div>
            )}
            {detail.memo && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">메모</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{detail.memo}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
