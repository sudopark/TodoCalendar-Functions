import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useUncompletedTodosStore } from '../stores/uncompletedTodosStore'
import { useToastStore } from '../stores/toastStore'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { t } = useTranslation()
  const { account, loading } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (account) {
      Promise.all([
        useEventTagStore.getState().fetchAll(),
        useCurrentTodosStore.getState().fetch(),
        useForemostEventStore.getState().fetch(),
        useUncompletedTodosStore.getState().fetch(),
      ]).catch(() => {
        useToastStore.getState().show(t('error.data_load_failed'), 'error')
      })
    }
  }, [account, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!account) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
