import { create } from 'zustand'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase'
import { apiClient } from '../api/apiClient'

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await apiClient.put('/v1/accounts/info', {})
      } catch {
        // 계정 등록 실패는 무시 (이미 등록된 경우 등)
      }
    }
    set({ user, loading: false })
  })

  return {
    user: null,
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
    },
  }
})
