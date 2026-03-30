import type { EventTime } from '../models'

interface EventTimeDisplayProps {
  eventTime: EventTime
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDateUTC(date: Date): string {
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
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

  // allday: offset을 더해 "원본 타임존의 자정"으로 맞춘 뒤 UTC 메서드로 날짜를 읽음
  // (브라우저 타임존과 무관하게 이벤트 생성 타임존 기준 날짜를 표시)
  const offset = eventTime.seconds_from_gmt
  const start = new Date((eventTime.period_start + offset) * 1000)
  const end = new Date((eventTime.period_end + offset) * 1000)

  if (isSameDayUTC(start, end)) {
    return <span>종일</span>
  }
  return <span>{formatDateUTC(start)} – {formatDateUTC(end)}</span>
}
