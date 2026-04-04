import { create } from 'zustand'

interface NotificationState {
  permission: NotificationPermission
  fcmToken: string | null
  requestPermission: () => Promise<void>
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  fcmToken: null,

  requestPermission: async () => {
    try {
      const permission = await Notification.requestPermission()
      set({ permission })

      if (permission === 'granted') {
        // Dynamic import to avoid loading Firebase Messaging if not needed
        const { getMessaging, getToken } = await import('firebase/messaging')
        const { app } = await import('../firebase')
        const messaging = getMessaging(app)
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        })
        set({ fcmToken: token })

        // 서버에 토큰 등록
        const { apiClient } = await import('../api/apiClient')
        await apiClient.put('/v1/user/notification', { fcm_token: token }).catch(() => {})
      }
    } catch (e) {
      console.warn('알림 권한 요청 실패:', e)
    }
  },

  reset: () => set({
    fcmToken: null,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default'
  }),
}))
