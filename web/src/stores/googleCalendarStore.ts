import { create } from 'zustand'

interface GoogleCalendarState {
  isConnected: boolean
  calendars: { id: string; name: string; color: string; visible: boolean }[]
  // TODO: OAuth 연동, 이벤트 로드, 캘린더 표시/숨김
  reset: () => void
}

export const useGoogleCalendarStore = create<GoogleCalendarState>((set) => ({
  isConnected: false,
  calendars: [],
  reset: () => set({ isConnected: false, calendars: [] }),
}))
