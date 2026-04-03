import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import type { Todo } from '../models'

interface CurrentTodosState {
  todos: Todo[]
  fetch: () => Promise<void>
  addTodo: (todo: Todo) => void
  removeTodo: (uuid: string) => void
  replaceTodo: (todo: Todo) => void
  reset: () => void
}

export const useCurrentTodosStore = create<CurrentTodosState>((set, _get) => ({
  todos: [],

  fetch: async () => {
    try {
      const todos = await todoApi.getCurrentTodos()
      set({ todos })
    } catch (e) {
      console.warn('Current todo 로드 실패:', e)
    }
  },

  addTodo: (todo: Todo) => set(s => ({ todos: [...s.todos, todo] })),
  removeTodo: (uuid: string) => set(s => ({ todos: s.todos.filter(t => t.uuid !== uuid) })),
  replaceTodo: (todo: Todo) => set(s => ({ todos: s.todos.map(t => t.uuid === todo.uuid ? todo : t) })),
  reset: () => set({ todos: [] }),
}))
