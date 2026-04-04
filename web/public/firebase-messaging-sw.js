// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js')

// Firebase config는 메인 앱에서 getToken 시 자동으로 전달됨
firebase.initializeApp({
  messagingSenderId: 'placeholder'
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  if (title) {
    self.registration.showNotification(title, { body: body ?? '' })
  }
})
