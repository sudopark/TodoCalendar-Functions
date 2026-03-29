import { create } from 'zustand'

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

interface UiState {
  selectedDate: Date | null
  setSelectedDate: (date: Date) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: null,
  setSelectedDate: (date: Date) => {
    const current = get().selectedDate
    if (current && isSameDay(current, date)) {
      set({ selectedDate: null })
    } else {
      set({ selectedDate: date })
    }
  },
}))
