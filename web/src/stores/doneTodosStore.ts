import { create } from 'zustand'
import { doneTodoApi } from '../api/doneTodoApi'
import type { DoneTodo } from '../models'

const PAGE_SIZE = 20

interface DoneTodosState {
  items: DoneTodo[]
  cursor: number | null
  hasMore: boolean
  isLoading: boolean
  fetchNext: () => Promise<void>
  revert: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

export const useDoneTodosStore = create<DoneTodosState>((set, get) => ({
  items: [],
  cursor: null,
  hasMore: true,
  isLoading: false,

  fetchNext: async () => {
    const { isLoading, hasMore, cursor } = get()
    if (isLoading || !hasMore) return
    set({ isLoading: true })
    try {
      const fetched = await doneTodoApi.getDoneTodos(PAGE_SIZE, cursor ?? undefined)
      set(state => {
        const last = fetched[fetched.length - 1]
        const nextCursor = last?.done_at ?? null
        return {
          items: [...state.items, ...fetched],
          cursor: nextCursor,
          hasMore: fetched.length === PAGE_SIZE && nextCursor !== null,
          isLoading: false,
        }
      })
    } catch (e) {
      console.warn('Done todos 로드 실패:', e)
      set({ isLoading: false })
    }
  },

  revert: async (id: string) => {
    try {
      await doneTodoApi.revertDoneTodo(id)
      set(state => ({ items: state.items.filter(i => i.uuid !== id) }))
    } catch (e) {
      console.warn('Todo 되돌리기 실패:', e)
      throw e
    }
  },

  remove: async (id: string) => {
    try {
      await doneTodoApi.deleteDoneTodo(id)
      set(state => ({ items: state.items.filter(i => i.uuid !== id) }))
    } catch (e) {
      console.warn('Done todo 삭제 실패:', e)
      throw e
    }
  },

  reset: () => set({ items: [], cursor: null, hasMore: true, isLoading: false }),
}))
