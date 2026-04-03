import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { ToastContainer } from './components/Toast'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'

const EventDetailPage = React.lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
const TodoFormPage = React.lazy(() => import('./pages/TodoFormPage').then(m => ({ default: m.TodoFormPage })))
const ScheduleFormPage = React.lazy(() => import('./pages/ScheduleFormPage').then(m => ({ default: m.ScheduleFormPage })))
const TagManagementPage = React.lazy(() => import('./pages/TagManagementPage').then(m => ({ default: m.TagManagementPage })))
const DoneTodosPage = React.lazy(() => import('./pages/DoneTodosPage').then(m => ({ default: m.DoneTodosPage })))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

function AppRoutes() {
  const location = useLocation()
  const background = (location.state as { background?: typeof location } | null)?.background

  return (
    <>
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes location={background ?? location}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <Header />
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/events/:id" element={<EventDetailPage />} />
                  <Route path="/todos/new" element={<TodoFormPage />} />
                  <Route path="/todos/:id/edit" element={<TodoFormPage />} />
                  <Route path="/schedules/new" element={<ScheduleFormPage />} />
                  <Route path="/schedules/:id/edit" element={<ScheduleFormPage />} />
                  <Route path="/tags" element={<TagManagementPage />} />
                  <Route path="/done" element={<DoneTodosPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </AuthGuard>
            }
          />
        </Routes>
      </Suspense>

      {/* 오버레이 렌더: background가 있을 때 EventDetailPage를 배경 위에 표시.
          배경 페이지의 Header가 이미 표시 중이므로 Header 불필요. */}
      {background && (
        <Suspense fallback={<LoadingSkeleton />}>
          <Routes>
            {[
              ['/events/:id', <EventDetailPage />],
              ['/todos/new', <TodoFormPage />],
              ['/todos/:id/edit', <TodoFormPage />],
              ['/schedules/new', <ScheduleFormPage />],
              ['/schedules/:id/edit', <ScheduleFormPage />],
              ['/tags', <TagManagementPage />],
            ].map(([path, element]) => (
              <Route key={path as string} path={path as string} element={<AuthGuard>{element as React.ReactElement}</AuthGuard>} />
            ))}
          </Routes>
        </Suspense>
      )}
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  )
}

export default App
