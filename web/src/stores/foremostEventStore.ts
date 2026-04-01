import { create } from 'zustand'
import { foremostApi } from '../api/foremostApi'
import type { ForemostEvent } from '../models'

interface ForemostEventState {
  foremostEvent: ForemostEvent | null
  fetch: () => Promise<void>
  setForemost: (eventId: string, isTodo: boolean) => Promise<void>
  removeForemost: () => Promise<void>
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

  setForemost: async (eventId: string, isTodo: boolean) => {
    try {
      const event = await foremostApi.setForemostEvent({ event_id: eventId, is_todo: isTodo })
      set({ foremostEvent: event })
    } catch (e) {
      console.warn('Foremost 설정 실패:', e)
    }
  },

  removeForemost: async () => {
    try {
      await foremostApi.removeForemostEvent()
      set({ foremostEvent: null })
    } catch (e) {
      console.warn('Foremost 해제 실패:', e)
    }
  },
}))
