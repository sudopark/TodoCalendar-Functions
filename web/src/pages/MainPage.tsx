import MonthCalendar from '../calendar/MonthCalendar'
import { DayEventList } from '../components/DayEventList'
import { CurrentTodoList } from '../components/CurrentTodoList'
import { ForemostEventBanner } from '../components/ForemostEventBanner'
import { useUiStore } from '../stores/uiStore'
import { useForemostEventStore } from '../stores/foremostEventStore'

export function MainPage() {
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/* Calendar panel */}
      <div className="w-full shrink-0 bg-white shadow-sm md:w-80 md:min-h-screen">
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

        {/* Current todos */}
        <CurrentTodoList />

        {/* Day events */}
        {selectedDate && (
          <section className="mt-4">
            <h2 className="mb-2 px-3 text-sm font-semibold text-gray-700">
              {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </h2>
            <DayEventList selectedDate={selectedDate} />
          </section>
        )}
      </div>
    </div>
  )
}
