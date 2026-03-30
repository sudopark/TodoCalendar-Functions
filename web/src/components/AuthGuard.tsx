import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useForemostEventStore } from '../stores/foremostEventStore'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { account, loading } = useAuthStore()

  useEffect(() => {
    if (account) {
      useEventTagStore.getState().fetchAll()
      useCurrentTodosStore.getState().fetch()
      useForemostEventStore.getState().fetch()
    }
  }, [account])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!account) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
