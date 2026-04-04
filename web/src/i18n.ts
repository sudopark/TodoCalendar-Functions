import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './locales/ko.json'
import en from './locales/en.json'

const STORAGE_KEY = 'language'

function loadLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'ko'
  } catch { return 'ko' }
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  lng: loadLanguage(),
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
})

export default i18n
