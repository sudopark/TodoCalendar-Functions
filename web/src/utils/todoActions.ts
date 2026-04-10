import { todoApi } from '../api/todoApi'
import { nextRepeatingTime } from './repeatingTimeCalculator'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useUncompletedTodosStore } from '../stores/uncompletedTodosStore'
import type { Todo } from '../models'

export async function skipRepeatingTodo(todo: Todo): Promise<void> {
  if (!todo.repeating || !todo.event_time) return
  const next = nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
  if (next) {
    await todoApi.patchTodo(todo.uuid, { event_time: next.time, repeating_turn: next.turn })
  } else {
    await todoApi.deleteTodo(todo.uuid)
  }
  await refreshAllTodoStores()
}

export async function refreshAllTodoStores(): Promise<void> {
  await Promise.all([
    useUncompletedTodosStore.getState().fetch(),
    useCurrentTodosStore.getState().fetch(),
    useCalendarEventsStore.getState().refreshCurrentRange(),
  ]).catch(e => console.warn('Todo stores refresh failed:', e))
}
