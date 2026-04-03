import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../../src/stores/authStore'

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
  apiClient: { put: vi.fn().mockResolvedValue({ uid: 'user-123' }) },
}))

describe('authStore', () => {
  beforeEach(async () => {
    useAuthStore.setState({ account: null, loading: true })
    vi.clearAllMocks()
    const { apiClient } = await import('../../src/api/apiClient')
    vi.mocked(apiClient.put).mockResolvedValue({ uid: 'user-123', email: 'test@example.com' })
  })

  describe('초기 상태', () => {
    it('인증 여부를 확인하는 동안 loading 상태이다', () => {
      expect(useAuthStore.getState().loading).toBe(true)
      expect(useAuthStore.getState().account).toBeNull()
    })
  })

  describe('인증 상태 동기화', () => {
    it('로그인된 사용자를 받으면 서버에서 계정 정보를 가져와 저장한다', async () => {
      await authCallbackRef.current({ uid: 'firebase-user' })

      const state = useAuthStore.getState()
      expect(state.account).toEqual({ uid: 'user-123', email: 'test@example.com' })
      expect(state.loading).toBe(false)
    })

    it('계정 등록 실패 시 account는 null이고 loading은 끝난다', async () => {
      const { apiClient } = await import('../../src/api/apiClient')
      vi.mocked(apiClient.put).mockRejectedValue(new Error('network error'))

      await authCallbackRef.current({ uid: 'firebase-user' })

      const state = useAuthStore.getState()
      expect(state.account).toBeNull()
      expect(state.loading).toBe(false)
    })

    it('미인증 상태를 받으면 account가 null이고 loading이 끝난다', async () => {
      await authCallbackRef.current(null)

      expect(useAuthStore.getState().account).toBeNull()
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
