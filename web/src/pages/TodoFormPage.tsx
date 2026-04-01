import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { todoApi } from '../api/todoApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useUiStore } from '../stores/uiStore'
import { EventTimePicker } from '../components/EventTimePicker'
import { RepeatingPicker } from '../components/RepeatingPicker'
import { TagSelector } from '../components/TagSelector'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Todo, EventTime, Repeating } from '../models'

export function TodoFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const selectedDate = useUiStore(s => s.selectedDate)

  const { addEvent, removeEvent, replaceEvent, refreshCurrentRange } = useCalendarEventsStore()
  const { addTodo, removeTodo, replaceTodo } = useCurrentTodosStore()

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Todo | null>(null)
  const [name, setName] = useState('')
  const [tagId, setTagId] = useState<string | null>(null)
  const [eventTime, setEventTime] = useState<EventTime | null>(() =>
    selectedDate ? { time_type: 'at', timestamp: Math.floor(selectedDate.getTime() / 1000) } : null
  )
  const [repeating, setRepeating] = useState<Repeating | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    todoApi.getTodo(id).then(todo => {
      setOriginal(todo)
      setName(todo.name)
      setTagId(todo.event_tag_id ?? null)
      setEventTime(todo.event_time ?? null)
      setRepeating(todo.repeating ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (id && original) {
        const updated = await todoApi.updateTodo(id, {
          name: name.trim(),
          event_tag_id: tagId,
          event_time: eventTime,
          repeating,
        })
        replaceEvent(id, { type: 'todo', event: updated })
        if (updated.is_current) replaceTodo(updated)
      } else {
        const created = await todoApi.createTodo({
          name: name.trim(),
          event_tag_id: tagId ?? undefined,
          event_time: eventTime ?? undefined,
          repeating: repeating ?? undefined,
        })
        if (created.event_time) addEvent({ type: 'todo', event: created })
        if (created.is_current) addTodo(created)
      }
      navigate(-1)
    } catch (e) {
      console.warn('저장 실패:', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    await todoApi.deleteTodo(id)
    if (original?.repeating) {
      await refreshCurrentRange()
    } else {
      removeEvent(id)
      removeTodo(id)
    }
    navigate(-1)
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
        <h1 className="text-lg font-bold">{id ? 'Todo 수정' : '새 Todo'}</h1>
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
          <div className="mt-1"><EventTimePicker value={eventTime} onChange={setEventTime} required={false} /></div>
        </div>

        {eventTime && (
          <div>
            <label className="block text-sm font-medium text-gray-700">반복</label>
            <div className="mt-1">
              <RepeatingPicker
                value={repeating}
                onChange={setRepeating}
                startTimestamp={
                  eventTime.time_type === 'at'
                    ? eventTime.timestamp
                    : eventTime.period_start
                }
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            저장
          </button>
          {id && (
            <button
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={() => setShowConfirm(true)}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Todo 삭제"
          message={`"${name}" 을 정말 삭제할까요?${original?.repeating ? '\n반복 Todo는 전체 시리즈가 삭제됩니다.' : ''}`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
