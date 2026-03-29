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
    } catch {
      set({ foremostEvent: null })
    }
  },
}))
