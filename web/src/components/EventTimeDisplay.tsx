import type { EventTime } from '../models'

interface EventTimeDisplayProps {
  eventTime: EventTime
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function EventTimeDisplay({ eventTime }: EventTimeDisplayProps) {
  if (eventTime.time_type === 'at') {
    const date = new Date(eventTime.timestamp * 1000)
    return <span>{formatTime(date)}</span>
  }

  if (eventTime.time_type === 'period') {
    const start = new Date(eventTime.period_start * 1000)
    const end = new Date(eventTime.period_end * 1000)
    return <span>{formatTime(start)} – {formatTime(end)}</span>
  }

  // allday
  const offset = eventTime.seconds_from_gmt
  const start = new Date((eventTime.period_start + offset) * 1000)
  const end = new Date((eventTime.period_end + offset) * 1000)

  if (isSameDay(start, end)) {
    return <span>종일</span>
  }
  return <span>{formatDate(start)} – {formatDate(end)}</span>
}
