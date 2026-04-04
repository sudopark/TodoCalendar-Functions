import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore when focus is in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (target.isContentEditable) return
      if (target.closest('[role="dialog"]') || target.closest('.fixed')) return

      switch (e.key) {
        case 'n':
          // New event (Todo by default)
          if (location.state?.background) return  // 이미 모달 열림
          navigate('/todos/new', { state: { background: location } })
          break
        case 'Escape':
          // Close overlay/modal
          if (location.state?.background) navigate(-1)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, location])
}
