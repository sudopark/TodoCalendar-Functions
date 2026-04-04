import { formatMonthTitle } from './calendarUtils'

interface CalendarHeaderProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export default function CalendarHeader({ year, month, onPrev, onNext }: CalendarHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        onClick={onPrev}
        className="rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
        aria-label="Previous month"
      >
        ‹
      </button>
      <h2 className="text-lg font-semibold dark:text-gray-100">{formatMonthTitle(year, month)}</h2>
      <button
        onClick={onNext}
        className="rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  )
}
