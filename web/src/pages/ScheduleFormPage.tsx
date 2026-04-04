import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { scheduleApi } from '../api/scheduleApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useUiStore } from '../stores/uiStore'
import { EventTimePicker } from '../components/EventTimePicker'
import { RepeatingPicker } from '../components/RepeatingPicker'
import { TagSelector } from '../components/TagSelector'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RepeatingScopeDialog, type RepeatScope } from '../components/RepeatingScopeDialog'
import { NotificationPicker } from '../components/NotificationPicker'
import type { Schedule, EventTime, Repeating, NotificationOption } from '../models'

export function ScheduleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const selectedDate = useUiStore(s => s.selectedDate)

  const { addEvent, removeEvent, refreshCurrentRange } = useCalendarEventsStore()

  const defaultEventTime = (): EventTime => {
    const base = selectedDate ?? new Date()
    return { time_type: 'at', timestamp: Math.floor(base.getTime() / 1000) }
  }

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Schedule | null>(null)
  const [name, setName] = useState('')
  const [tagId, setTagId] = useState<string | null>(null)
  const [eventTime, setEventTime] = useState<EventTime>(defaultEventTime)
  const [repeating, setRepeating] = useState<Repeating | null>(null)
  const [notifications, setNotifications] = useState<NotificationOption[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    scheduleApi.getSchedule(id).then(sch => {
      setOriginal(sch)
      setName(sch.name)
      setTagId(sch.event_tag_id ?? null)
      setEventTime(sch.event_time)
      setRepeating(sch.repeating ?? null)
      setNotifications(sch.notification_options ?? [])
      setLoading(false)
    }).catch((e) => { console.warn('일정 로드 실패:', e); setLoading(false) })
  }, [id])

  function handleEventTimeChange(newTime: EventTime) {
    const prevIsAllDay = eventTime.time_type === 'allday'
    const nextIsAllDay = newTime.time_type === 'allday'
    if (prevIsAllDay !== nextIsAllDay) setNotifications([])
    setEventTime(newTime)
  }

  function occurrenceStart(sch: Schedule): number {
    const et = sch.event_time
    return et.time_type === 'at' ? et.timestamp : et.period_start
  }

  async function applyCreate() {
    const created = await scheduleApi.createSchedule({
      name: name.trim(),
      event_tag_id: tagId ?? undefined,
      event_time: eventTime,
      repeating: repeating ?? undefined,
      notification_options: notifications.length > 0 ? notifications : undefined,
    })
    addEvent({ type: 'schedule', event: created })
  }

  async function applyUpdate(scope: RepeatScope) {
    if (!id || !original) return
    if (!original.repeating) {
      // Non-repeating: event_time이 바뀌면 날짜 키가 달라질 수 있으므로 remove → add로 갱신
      const updated = await scheduleApi.updateSchedule(id, {
        name: name.trim(),
        event_tag_id: tagId,
        event_time: eventTime,
        repeating: repeating ?? undefined,
        notification_options: notifications.length > 0 ? notifications : null,
      })
      removeEvent(id)
      addEvent({ type: 'schedule', event: updated })
    } else if (scope === 'all') {
      // Full repeating series: refresh calendar
      await scheduleApi.updateSchedule(id, {
        name: name.trim(),
        event_tag_id: tagId,
        event_time: eventTime,
        repeating: repeating ?? undefined,
        notification_options: notifications.length > 0 ? notifications : null,
      })
      await refreshCurrentRange()
    } else if (scope === 'this') {
      const turn = original.show_turns?.[0] ?? 0
      await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...(original.exclude_repeatings ?? []), turn] })
      await scheduleApi.createSchedule({
        name: name.trim(),
        event_tag_id: tagId ?? undefined,
        event_time: eventTime,
        repeating: undefined,
        notification_options: notifications.length > 0 ? notifications : undefined,
      })
      await refreshCurrentRange()
    } else {
      // scope === 'future'
      const cutoff = occurrenceStart(original) - 1
      await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
      await scheduleApi.createSchedule({
        name: name.trim(),
        event_tag_id: tagId ?? undefined,
        event_time: eventTime,
        repeating: repeating ?? undefined,
        notification_options: notifications.length > 0 ? notifications : undefined,
      })
      await refreshCurrentRange()
    }
  }

  async function applyDelete(scope: RepeatScope) {
    if (!id || !original) return
    try {
      if (!original.repeating) {
        // Non-repeating: optimistic removeEvent
        await scheduleApi.deleteSchedule(id)
        removeEvent(id)
      } else if (scope === 'all') {
        // Full repeating series: refresh calendar
        await scheduleApi.deleteSchedule(id)
        await refreshCurrentRange()
      } else if (scope === 'this') {
        // show_turns[0]: 현재 화면에 표시된 반복 회차. 없으면 0(첫 번째 회차)으로 폴백
        const turn = original.show_turns?.[0] ?? 0
        await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...(original.exclude_repeatings ?? []), turn] })
        await refreshCurrentRange()
      } else {
        // scope === 'future'
        const cutoff = occurrenceStart(original) - 1
        await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
        await refreshCurrentRange()
      }
      navigate(-1)
    } catch (e) {
      console.warn('삭제 실패:', e)
      setError('삭제에 실패했습니다. 다시 시도해주세요.')
      setShowDeleteScope(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    if (id && original?.repeating) { setShowSaveScope(true); return }
    setSaving(true)
    try {
      if (id) await applyUpdate('all')
      else await applyCreate()
      navigate(-1)
    } catch (e) {
      console.warn('저장 실패:', e)
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveWithScope(scope: RepeatScope) {
    setShowSaveScope(false)
    setSaving(true)
    try {
      await applyUpdate(scope)
      navigate(-1)
    } catch (e) {
      console.warn('저장 실패:', e)
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{id ? 'Schedule 수정' : '새 Schedule'}</h1>
        <button className="text-sm text-gray-500" onClick={() => navigate(-1)}>취소</button>
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">이름</label>
          <input
            aria-label="이름"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">태그</label>
          <div className="mt-1"><TagSelector value={tagId} onChange={setTagId} /></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">시간</label>
          <div className="mt-1">
            <EventTimePicker value={eventTime} onChange={v => v && handleEventTimeChange(v)} required={true} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">반복</label>
          <div className="mt-1">
            <RepeatingPicker
              value={repeating}
              onChange={setRepeating}
              startTimestamp={eventTime.time_type === 'at' ? eventTime.timestamp : eventTime.period_start}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">알림</label>
          <div className="mt-1">
            <NotificationPicker
              value={notifications}
              onChange={setNotifications}
              isAllDay={eventTime.time_type === 'allday'}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            저장
          </button>
          {id && (
            <button
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={() => original?.repeating ? setShowDeleteScope(true) : setShowDeleteConfirm(true)}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Schedule 삭제"
          message={`"${name}"을 삭제할까요?`}
          confirmLabel="삭제"
          onConfirm={async () => { setShowDeleteConfirm(false); await applyDelete('all') }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showSaveScope && (
        <RepeatingScopeDialog
          mode="edit"
          onSelect={handleSaveWithScope}
          onCancel={() => setShowSaveScope(false)}
        />
      )}
      {showDeleteScope && (
        <RepeatingScopeDialog
          mode="delete"
          onSelect={async scope => { setShowDeleteScope(false); await applyDelete(scope) }}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}
    </div>
  )
}
