import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useEventTagStore } from '../stores/eventTagStore'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useToastStore } from '../stores/toastStore'
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
  const location = useLocation()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const setForemost = useForemostEventStore(s => s.setForemost)
  const removeForemost = useForemostEventStore(s => s.removeForemost)

  const [event, setEvent] = useState<EventItem | null>(null)
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [searchParams] = useSearchParams()
  const eventType = (location.state as { eventType?: string } | null)?.eventType
    ?? searchParams.get('type')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EventDetail>({ place: '', url: '', memo: '' })

  useEffect(() => {
    if (!id) return

    async function load(eventId: string) {
      setLoading(true)
      try {
        let item: EventItem
        if (eventType === 'schedule') {
          item = await scheduleApi.getSchedule(eventId)
        } else if (eventType === 'todo') {
          item = await todoApi.getTodo(eventId)
        } else {
          // eventType 미지정: todo 먼저 시도, 실패 시 schedule fallback
          try {
            item = await todoApi.getTodo(eventId)
          } catch {
            item = await scheduleApi.getSchedule(eventId)
          }
        }
        setEvent(item)

        try {
          const d = await eventDetailApi.getEventDetail(eventId)
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

    load(id)
  }, [id, eventType])

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
  const isTodo = 'is_current' in event

  const isForemost = foremostEvent?.event_id === id

  function handleEditStart() {
    setEditForm(detail ?? { place: '', url: '', memo: '' })
    setIsEditing(true)
  }

  function handleEditCancel() {
    setIsEditing(false)
    setEditForm(detail ?? { place: '', url: '', memo: '' })
  }

  async function handleEditSave() {
    if (!id) return
    try {
      const updated = await eventDetailApi.updateEventDetail(id, editForm)
      setDetail(updated)
      setIsEditing(false)
    } catch (e) {
      console.warn('이벤트 상세 저장 실패:', e)
      useToastStore.getState().show('이벤트 상세 저장에 실패했습니다', 'error')
    }
  }

  async function handleForemostToggle() {
    if (isForemost) {
      await removeForemost()
    } else if (id) {
      await setForemost(id, isTodo)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          onClick={() => navigate(-1)}
        >
          ← 뒤로
        </button>
        {event && (
          <button
            className="text-sm text-blue-500 hover:text-blue-700"
            onClick={() => {
              const path = eventType === 'schedule' ? `/schedules/${id}/edit` : `/todos/${id}/edit`
              navigate(path, { state: { background: location } })
            }}
          >
            수정
          </button>
        )}
      </div>

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

        {/* EventDetail — 항상 표시 */}
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {/* Edit / Save / Cancel buttons */}
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <button
                  className="text-sm text-blue-500 hover:text-blue-700"
                  onClick={handleEditSave}
                >
                  저장
                </button>
                <button
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={handleEditCancel}
                >
                  취소
                </button>
              </>
            ) : (
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={handleEditStart}
              >
                {detail ? '편집' : '상세 추가'}
              </button>
            )}
          </div>

          {isEditing ? (
            <>
              {/* Place */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">장소</p>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={editForm.place ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, place: e.target.value }))}
                />
              </div>

              {/* URL */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">URL</p>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={editForm.url ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                />
              </div>

              {/* Memo */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">메모</p>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  rows={4}
                  value={editForm.memo ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, memo: e.target.value }))}
                />
              </div>
            </>
          ) : detail ? (
            <>
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
            </>
          ) : (
            <p className="text-sm text-gray-400">장소, URL, 메모를 추가하세요</p>
          )}
        </div>
      </div>

      {/* Foremost toggle */}
      <div className="mt-4 flex justify-center">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            isForemost
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={handleForemostToggle}
        >
          {isForemost ? '고정 해제' : '고정 설정'}
        </button>
      </div>
    </div>
  )
}
