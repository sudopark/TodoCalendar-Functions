import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MonthCalendar from '../calendar/MonthCalendar'
import { DayEventList } from '../components/DayEventList'
import { CurrentTodoList } from '../components/CurrentTodoList'
import { UncompletedTodoList } from '../components/UncompletedTodoList'
import { ForemostEventBanner } from '../components/ForemostEventBanner'
import { TypeSelectorPopup } from '../components/TypeSelectorPopup'
import { useUiStore } from '../stores/uiStore'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function MainPage() {
  useKeyboardShortcuts()
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleTypeSelect(type: 'todo' | 'schedule') {
    setShowTypeSelector(false)
    navigate(type === 'todo' ? '/todos/new' : '/schedules/new', { state: { background: location } })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900 md:flex-row">
      {/* Calendar panel */}
      <div className="w-full shrink-0 bg-white dark:bg-gray-800 shadow-sm md:w-80 md:min-h-screen">
        <MonthCalendar />
      </div>

      {/* Event panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {/* Foremost event: foremostEvent가 있을 때만 wrapper 포함해 렌더 */}
        {foremostEvent && (
          <div className="mb-4">
            <ForemostEventBanner />
          </div>
        )}

        {/* Uncompleted todos */}
        <UncompletedTodoList />

        {/* Current todos */}
        <CurrentTodoList />

        {/* Day events */}
        {selectedDate && (
          <section className="mt-4">
            <h2 className="mb-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </h2>
            <DayEventList selectedDate={selectedDate} />
          </section>
        )}
      </div>

      {/* FAB */}
      <button
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg hover:bg-blue-700"
        onClick={() => setShowTypeSelector(o => !o)}
        aria-label="새 이벤트 추가"
      >
        +
      </button>

      {showTypeSelector && (
        <TypeSelectorPopup onSelect={handleTypeSelect} onClose={() => setShowTypeSelector(false)} />
      )}
    </div>
  )
}
