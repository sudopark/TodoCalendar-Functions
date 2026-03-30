import { useNavigate, useLocation } from 'react-router-dom'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useEventTagStore } from '../stores/eventTagStore'

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
            <li key={todo.uuid}>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => navigate(`/events/${todo.uuid}`, {
                  state: { background: location, eventType: 'todo' },
                })}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-sm text-gray-900">{todo.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
