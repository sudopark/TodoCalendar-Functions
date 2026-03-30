import { create } from 'zustand'
import { foremostApi } from '../api/foremostApi'
import type { ForemostEvent } from '../models'

interface ForemostEventState {
  foremostEvent: ForemostEvent | null
  fetch: () => Promise<void>
}

export const useForemostEventStore = create<ForemostEventState>((set) => ({
  foremostEvent: null,

  fetch: async () => {
    try {
      const event = await foremostApi.getForemostEvent()
      set({ foremostEvent: event })
    } catch (e) {
      console.warn('Foremost event 로드 실패:', e)
      set({ foremostEvent: null })
    }
  },
}))
