import { useNavigate, useLocation } from 'react-router-dom'
import { todoApi } from '../api/todoApi'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import type { Todo } from '../models'

// 이벤트 핸들러로 전달되므로 렌더 사이클 밖에서 실행됨.
// React 훅 규칙 위반 없이 스토어 상태를 읽으려면 getState()를 직접 호출해야 한다.
async function completeTodo(todo: Todo) {
  const { removeTodo } = useCurrentTodosStore.getState()
  const { removeEvent, refreshCurrentRange } = useCalendarEventsStore.getState()
  try {
    await todoApi.completeTodo(todo.uuid, { origin: todo })
    if (todo.repeating) {
      await refreshCurrentRange()
    } else {
      removeEvent(todo.uuid)
      removeTodo(todo.uuid)
    }
  } catch (e) {
    console.warn('완료 처리 실패:', e)
  }
}

export function CurrentTodoList() {
  const todos = useCurrentTodosStore(s => s.todos)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const navigate = useNavigate()
  const location = useLocation()

  if (todos.length === 0) return null

  return (
    <section>
      <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Current
      </h3>
      <ul className="divide-y divide-gray-100">
        {todos.map(todo => {
          const color = todo.event_tag_id
            ? (getColorForTagId(todo.event_tag_id) ?? '#9ca3af')
            : '#9ca3af'
          return (
            <li key={todo.uuid} className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                aria-label={todo.name}
                className="h-4 w-4 rounded border-gray-300"
                onChange={() => completeTodo(todo)}
              />
              <button
                className="flex flex-1 items-center gap-2 rounded text-left hover:bg-gray-50"
                onClick={() => navigate(`/events/${todo.uuid}`, {
                  state: { background: location, eventType: 'todo' },
                })}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-sm text-gray-900">{todo.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
