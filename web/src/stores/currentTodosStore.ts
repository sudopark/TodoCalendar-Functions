import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import type { Todo } from '../models'

interface CurrentTodosState {
  todos: Todo[]
  fetch: () => Promise<void>
}

export const useCurrentTodosStore = create<CurrentTodosState>((set) => ({
  todos: [],

  fetch: async () => {
    try {
      const todos = await todoApi.getCurrentTodos()
      set({ todos })
    } catch (e) {
      console.warn('Current todo 로드 실패:', e)
    }
  },
}))
