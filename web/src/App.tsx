import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'
import { EventDetailPage } from './pages/EventDetailPage'

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
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>

      {/* background location이 있을 때 EventDetail을 오버레이로 렌더 */}
      {background && (
        <Routes>
          <Route
            path="/events/:id"
            element={
              <AuthGuard>
                <EventDetailPage />
              </AuthGuard>
            }
          />
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
