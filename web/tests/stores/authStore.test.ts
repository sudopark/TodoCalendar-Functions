import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../../src/stores/authStore'

// Firebase auth 상태 변화를 시뮬레이션하기 위한 콜백 참조
const authCallbackRef = vi.hoisted(() => ({ current: (_user: any) => {} }))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authCallbackRef.current = callback
    return () => {}
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function(this: any) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function(this: any) { return this }),
}))

vi.mock('../../src/firebase', () => ({ auth: {} }))

vi.mock('../../src/api/apiClient', () => ({
  apiClient: { put: vi.fn().mockResolvedValue({}) },
}))

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: true })
    vi.clearAllMocks()
  })

  describe('초기 상태', () => {
    it('인증 여부를 확인하는 동안 loading 상태이다', () => {
      expect(useAuthStore.getState().loading).toBe(true)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('인증 상태 동기화', () => {
    it('Firebase에서 로그인된 사용자를 받으면 user가 설정되고 loading이 끝난다', async () => {
      const mockUser = { uid: 'user-123', email: 'test@example.com' }
      await authCallbackRef.current(mockUser)

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().loading).toBe(false)
    })

    it('Firebase에서 미인증 상태를 받으면 user가 null이고 loading이 끝난다', async () => {
      await authCallbackRef.current(null)

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('Google 로그인', () => {
    it('로그인 성공 시 에러 없이 완료된다', async () => {
      const { signInWithPopup } = await import('firebase/auth')
      vi.mocked(signInWithPopup).mockResolvedValue({} as any)

      await expect(useAuthStore.getState().signInWithGoogle()).resolves.toBeUndefined()
    })

    it('로그인 실패 시 에러가 전파된다', async () => {
      const { signInWithPopup } = await import('firebase/auth')
      vi.mocked(signInWithPopup).mockRejectedValue(new Error('popup-closed'))

      await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow('popup-closed')
    })
  })

  describe('Apple 로그인', () => {
    it('로그인 성공 시 에러 없이 완료된다', async () => {
      const { signInWithPopup } = await import('firebase/auth')
      vi.mocked(signInWithPopup).mockResolvedValue({} as any)

      await expect(useAuthStore.getState().signInWithApple()).resolves.toBeUndefined()
    })

    it('로그인 실패 시 에러가 전파된다', async () => {
      const { signInWithPopup } = await import('firebase/auth')
      vi.mocked(signInWithPopup).mockRejectedValue(new Error('auth/cancelled'))

      await expect(useAuthStore.getState().signInWithApple()).rejects.toThrow('auth/cancelled')
    })
  })

  describe('로그아웃', () => {
    it('로그아웃 후 에러 없이 완료된다', async () => {
      const { signOut } = await import('firebase/auth')
      vi.mocked(signOut).mockResolvedValue(undefined)

      await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined()
    })
  })
})
