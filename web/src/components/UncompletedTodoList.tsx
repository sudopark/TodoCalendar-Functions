import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useUncompletedTodosStore } from '../stores/uncompletedTodosStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { RepeatingScopeDialog, type RepeatScope } from './RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../utils/repeatingTimeCalculator'
import { skipRepeatingTodo, refreshAllTodoStores } from '../utils/todoActions'
import type { Todo } from '../models'

export function UncompletedTodoList() {
  const { t } = useTranslation()
  const todos = useUncompletedTodosStore(s => s.todos)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const { isTagHidden } = useTagFilterStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [scopeTarget, setScopeTarget] = useState<Todo | null>(null)

  async function handleComplete(todo: Todo) {
    if (todo.repeating && todo.event_time) {
      setScopeTarget(todo)
      return
    }
    await doComplete(todo)
  }

  async function doComplete(todo: Todo, scope?: RepeatScope) {
    const { removeTodo } = useUncompletedTodosStore.getState()
    const { removeEvent } = useCalendarEventsStore.getState()
    try {
      if (scope === 'this' && todo.repeating && todo.event_time) {
        const next = nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
        await todoApi.completeTodo(todo.uuid, { origin: todo, next_event_time: next?.time, next_repeating_turn: next?.turn })
      } else if (scope === 'future') {
        const startTs = getStartTimestamp(todo.event_time!)
        await todoApi.patchTodo(todo.uuid, { repeating: { ...todo.repeating, end: startTs - 1 } })
        await todoApi.completeTodo(todo.uuid, { origin: todo })
      } else {
        await todoApi.completeTodo(todo.uuid, { origin: todo })
      }

      if (todo.repeating) {
        await refreshAllTodoStores()
      } else {
        removeEvent(todo.uuid)
        removeTodo(todo.uuid)
      }
    } catch (e) {
      console.warn('완료 처리 실패:', e)
    }
  }

  async function handleCompleteWithScope(scope: RepeatScope) {
    if (!scopeTarget) return
    const todo = scopeTarget
    setScopeTarget(null)
    await doComplete(todo, scope)
  }

  async function handleSkip(todo: Todo) {
    try {
      await skipRepeatingTodo(todo)
    } catch (e) {
      console.warn('건너뛰기 실패:', e)
    }
  }

  const visibleTodos = todos.filter(t => !isTagHidden(t.event_tag_id))

  if (visibleTodos.length === 0) return null

  return (
    <section>
      <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-400">
        {t('todo.uncompleted')}
      </h3>
      <ul className="divide-y divide-gray-100">
        {visibleTodos.map(todo => {
          const color = todo.event_tag_id
            ? (getColorForTagId(todo.event_tag_id) ?? '#9ca3af')
            : '#9ca3af'
          return (
            <li key={todo.uuid} className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                aria-label={todo.name}
                className="h-4 w-4 rounded border-gray-300"
                onChange={() => handleComplete(todo)}
              />
              <button
                className="flex flex-1 items-center gap-2 rounded text-left hover:bg-gray-50"
                onClick={() => navigate(`/events/${todo.uuid}?type=todo`, {
                  state: { background: location, eventType: 'todo' },
                })}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-sm text-gray-900">{todo.name}</span>
              </button>
              {todo.repeating && (
                <button
                  onClick={() => handleSkip(todo)}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
                >
                  {t('todo.skip')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {scopeTarget && (
        <RepeatingScopeDialog
          mode="complete"
          eventType="todo"
          onSelect={handleCompleteWithScope}
          onCancel={() => setScopeTarget(null)}
        />
      )}
    </section>
  )
}
