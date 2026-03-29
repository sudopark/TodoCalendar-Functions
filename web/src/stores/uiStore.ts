import { create } from 'zustand'
import { formatDateKey } from '../utils/eventTimeUtils'

interface UiState {
  selectedDate: Date | null
  setSelectedDate: (date: Date) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: null,
  setSelectedDate: (date: Date) => {
    const current = get().selectedDate
    if (current && formatDateKey(current) === formatDateKey(date)) {
      set({ selectedDate: null })
    } else {
      set({ selectedDate: date })
    }
  },
}))
