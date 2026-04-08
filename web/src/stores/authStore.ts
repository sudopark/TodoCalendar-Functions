import { create } from 'zustand'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth'
import { auth } from '../firebase'
import { apiClient } from '../api/apiClient'

export interface Account {
  uid: string
  email?: string | null
  method?: string | null
  first_signed_in?: string | null
  last_sign_in?: string | null
}

interface AuthState {
  account: Account | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const account = await apiClient.put<Account>('/v1/accounts/info', {})
        set({ account, loading: false })
      } catch (e) {
        console.warn('계정 등록 실패:', e)
        set({ account: null, loading: false })
      }
    } else {
      set({ account: null, loading: false })
    }
  })

  return {
    account: null,
    loading: true,
    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    },
    signInWithApple: async () => {
      const provider = new OAuthProvider('apple.com')
      await signInWithPopup(auth, provider)
    },
    signOut: async () => {
      await firebaseSignOut(auth)
      const { useEventTagStore } = await import('./eventTagStore')
      const { useCurrentTodosStore } = await import('./currentTodosStore')
      const { useForemostEventStore } = await import('./foremostEventStore')
      const { useCalendarEventsStore } = await import('./calendarEventsStore')
      const { useUncompletedTodosStore } = await import('./uncompletedTodosStore')
      useEventTagStore.getState().reset()
      useCurrentTodosStore.getState().reset()
      useForemostEventStore.getState().reset()
      useCalendarEventsStore.getState().reset()
      useUncompletedTodosStore.getState().reset()
      const { useDoneTodosStore } = await import('./doneTodosStore')
      const { useGoogleCalendarStore } = await import('./googleCalendarStore')
      useDoneTodosStore.getState().reset()
      useGoogleCalendarStore.getState().reset()
      const { useNotificationStore } = await import('./notificationStore')
      useNotificationStore.getState().reset()
    },
  }
})
