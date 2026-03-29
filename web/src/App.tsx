import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'
import { EventDetailPage } from './pages/EventDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
    </BrowserRouter>
  )
}

export default App
