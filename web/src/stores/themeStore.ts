import { create } from 'zustand'

type Theme = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'theme'

function loadTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: loadTheme(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
}))

// 초기 적용
applyTheme(loadTheme())
