import { useState } from 'react'
import type { EventTime } from '../models'

type TimeType = 'none' | 'at' | 'period' | 'allday'

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function datetimeLocalToTs(v: string): number {
  return Math.floor(new Date(v).getTime() / 1000)
}

function tsToDateInput(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dateInputToTs(v: string): number {
  return Math.floor(new Date(v + 'T00:00:00').getTime() / 1000)
}

function localSecondsFromGmt(): number {
  return -(new Date().getTimezoneOffset() * 60)
}

interface EventTimePickerProps {
  value: EventTime | null
  onChange: (value: EventTime | null) => void
  required?: boolean
}

export function EventTimePicker({ value, onChange, required = false }: EventTimePickerProps) {
  const now = Math.floor(Date.now() / 1000)

  const initType = (): TimeType => {
    if (!value) return required ? 'at' : 'none'
    return value.time_type
  }

  const initInternal = (): EventTime | null => {
    if (value) return value
    if (required) return { time_type: 'at', timestamp: now }
    return null
  }

  const [type, setType] = useState<TimeType>(initType)
  const [internal, setInternal] = useState<EventTime | null>(initInternal)

  function handleTypeChange(t: TimeType) {
    setType(t)
    if (t === 'none') {
      setInternal(null)
      onChange(null)
      return
    }
    let next: EventTime
    if (t === 'at') next = { time_type: 'at', timestamp: now }
    else if (t === 'period') next = { time_type: 'period', period_start: now, period_end: now + 3600 }
    else next = { time_type: 'allday', period_start: now, period_end: now, seconds_from_gmt: localSecondsFromGmt() }
    setInternal(next)
    onChange(next)
  }

  function handleValueChange(next: EventTime) {
    setInternal(next)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {!required && (
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="time-type" checked={type === 'none'} onChange={() => handleTypeChange('none')} />
            시간 없음
          </label>
        )}
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" name="time-type" checked={type === 'at'} onChange={() => handleTypeChange('at')} />
          특정 시각
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" name="time-type" checked={type === 'period'} onChange={() => handleTypeChange('period')} />
          기간
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" name="time-type" checked={type === 'allday'} onChange={() => handleTypeChange('allday')} />
          종일
        </label>
      </div>

      {type === 'at' && internal?.time_type === 'at' && (
        <div>
          <label className="block text-xs text-gray-500" htmlFor="at-input">시각</label>
          <input
            id="at-input"
            aria-label="시각"
            type="datetime-local"
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={tsToDatetimeLocal(internal.timestamp)}
            onChange={e => handleValueChange({ time_type: 'at', timestamp: datetimeLocalToTs(e.target.value) })}
          />
        </div>
      )}

      {type === 'period' && internal?.time_type === 'period' && (
        <div className="space-y-1">
          <div className="flex gap-3">
            <div>
              <label className="block text-xs text-gray-500" htmlFor="period-start">시작</label>
              <input
                id="period-start"
                aria-label="시작"
                type="datetime-local"
                className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                value={tsToDatetimeLocal(internal.period_start)}
                onChange={e => handleValueChange({ ...internal, period_start: datetimeLocalToTs(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500" htmlFor="period-end">종료</label>
              <input
                id="period-end"
                aria-label="종료"
                type="datetime-local"
                className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                value={tsToDatetimeLocal(internal.period_end)}
                onChange={e => handleValueChange({ ...internal, period_end: datetimeLocalToTs(e.target.value) })}
              />
            </div>
          </div>
          {internal.period_end < internal.period_start && (
            <p className="text-xs text-red-500">종료 시각이 시작 시각보다 앞에 있습니다.</p>
          )}
        </div>
      )}

      {type === 'allday' && internal?.time_type === 'allday' && (
        <div className="flex gap-3">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="allday-start">시작일</label>
            <input
              id="allday-start"
              aria-label="시작일"
              type="date"
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={tsToDateInput(internal.period_start + internal.seconds_from_gmt)}
              onChange={e => handleValueChange({ ...internal, period_start: dateInputToTs(e.target.value) - internal.seconds_from_gmt })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="allday-end">종료일</label>
            <input
              id="allday-end"
              aria-label="종료일"
              type="date"
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={tsToDateInput(internal.period_end + internal.seconds_from_gmt)}
              onChange={e => handleValueChange({ ...internal, period_end: dateInputToTs(e.target.value) - internal.seconds_from_gmt })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
