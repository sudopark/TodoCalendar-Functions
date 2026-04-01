import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { TodoFormPage } from './pages/TodoFormPage'
import { ScheduleFormPage } from './pages/ScheduleFormPage'
import { TagManagementPage } from './pages/TagManagementPage'

function AppRoutes() {
  const location = useLocation()
  const background = (location.state as { background?: typeof location } | null)?.background

  return (
    <>
      {/* background가 있으면 캘린더 유지, 없으면 현재 위치로 라우팅 */}
      <Routes location={background ?? location}>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/todos/new" element={<TodoFormPage />} />
                <Route path="/todos/:id/edit" element={<TodoFormPage />} />
                <Route path="/schedules/new" element={<ScheduleFormPage />} />
                <Route path="/schedules/:id/edit" element={<ScheduleFormPage />} />
                <Route path="/tags" element={<TagManagementPage />} />
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>

      {/* background location이 있을 때 오버레이로 렌더 */}
      {background && (
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
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
