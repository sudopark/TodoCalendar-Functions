import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import type { Todo } from '../models'

interface UncompletedTodosState {
  todos: Todo[]
  fetch: () => Promise<void>
  removeTodo: (id: string) => void
  reset: () => void
}

export const useUncompletedTodosStore = create<UncompletedTodosState>((set, get) => ({
  todos: [],

  fetch: async () => {
    try {
      const todos = await todoApi.getUncompletedTodos()
      set({ todos })
    } catch (e) {
      console.warn('미완료 할일 로드 실패:', e)
    }
  },

  removeTodo: (id: string) => {
    set({ todos: get().todos.filter(t => t.uuid !== id) })
  },

  reset: () => set({ todos: [] }),
}))
