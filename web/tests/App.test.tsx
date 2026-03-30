import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../src/App'

// App은 BrowserRouter + AuthGuard를 포함하므로 authStore와 firebase를 모킹
vi.mock('../src/stores/authStore', () => ({
  useAuthStore: () => ({
    account: { uid: 'test-user' },
    loading: false,
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('../src/firebase', () => ({ auth: {} }))

vi.mock('../src/api/todoApi', () => ({
  todoApi: { getCurrentTodos: async () => [] },
}))

vi.mock('../src/api/foremostApi', () => ({
  foremostApi: { getForemostEvent: async () => null },
}))

test('로그인된 사용자에게 달력이 표시된다', () => {
  render(<App />)
  expect(screen.getByText('Sun')).toBeInTheDocument()
  expect(screen.getAllByTestId('day-cell').length).toBeGreaterThan(0)
})
