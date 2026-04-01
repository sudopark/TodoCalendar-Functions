import { useState } from 'react'
import type { Repeating, RepeatingOption } from '../models'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function defaultOption(type: string, startTs: number): RepeatingOption {
  const d = new Date(startTs * 1000)
  switch (type) {
    case 'every_day':
      return { optionType: 'every_day', interval: 1 }
    case 'every_week':
      return { optionType: 'every_week', interval: 1, dayOfWeek: [d.getDay()], timeZone: TZ }
    case 'every_month':
      return { optionType: 'every_month', interval: 1, monthDaySelection: { days: [d.getDate()] }, timeZone: TZ }
    case 'every_year':
      return { optionType: 'every_year', interval: 1, months: [d.getMonth() + 1], weekOrdinals: [], dayOfWeek: [d.getDay()], timeZone: TZ }
    case 'every_year_some_day':
      return { optionType: 'every_year_some_day', interval: 1, month: d.getMonth() + 1, day: d.getDate(), timeZone: TZ }
    case 'lunar_calendar_every_year':
      return { optionType: 'lunar_calendar_every_year', month: d.getMonth() + 1, day: d.getDate(), timeZone: TZ }
    default:
      return { optionType: 'every_day', interval: 1 }
  }
}

interface RepeatingPickerProps {
  value: Repeating | null
  onChange: (value: Repeating | null) => void
  startTimestamp: number
}

export function RepeatingPicker({ value, onChange, startTimestamp }: RepeatingPickerProps) {
  const [enabled, setEnabled] = useState(!!value)
  const [option, setOption] = useState<RepeatingOption>(
    value?.option ?? defaultOption('every_day', startTimestamp)
  )
  const [endType, setEndType] = useState<'none' | 'date' | 'count'>('none')
  const [endDate, setEndDate] = useState('')
  const [endCount, setEndCount] = useState(10)
  const [monthMode, setMonthMode] = useState<'days' | 'week'>('days')

  function buildRepeating(opt: RepeatingOption): Repeating {
    const end =
      endType === 'date' && endDate
        ? Math.floor(new Date(endDate + 'T00:00:00').getTime() / 1000)
        : undefined
    const end_count = endType === 'count' ? endCount : undefined
    return { start: startTimestamp, option: opt, end, end_count }
  }

  function emit(opt: RepeatingOption) {
    onChange(buildRepeating(opt))
  }

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange(null)
    } else {
      emit(option)
    }
  }

  function handleTypeChange(type: string) {
    const opt = defaultOption(type, startTimestamp)
    setOption(opt)
    emit(opt)
  }

  // Type-narrowed helpers to avoid TS narrowing issues in JSX
  const weekOption = option.optionType === 'every_week' ? option : null
  const monthOption = option.optionType === 'every_month' ? option : null
  const yearSomeDayOption = option.optionType === 'every_year_some_day' ? option : null
  const lunarOption = option.optionType === 'lunar_calendar_every_year' ? option : null
  const specificDayOption = yearSomeDayOption ?? lunarOption

  const interval = option.optionType !== 'lunar_calendar_every_year' ? option.interval : null

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" aria-label="반복" checked={enabled} onChange={handleToggle} />
        반복
      </label>

      {enabled && (
        <div className="space-y-3 pl-4">
          {/* 반복 유형 선택 */}
          <div>
            <label className="block text-xs text-gray-500">반복 유형</label>
            <select
              aria-label="반복 유형"
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={option.optionType}
              onChange={e => handleTypeChange(e.target.value)}
            >
              <option value="every_day">매일</option>
              <option value="every_week">매주</option>
              <option value="every_month">매월</option>
              <option value="every_year">매년</option>
              <option value="every_year_some_day">매년 (특정일)</option>
              <option value="lunar_calendar_every_year">매년 (음력)</option>
            </select>
          </div>

          {/* 간격 (음력 제외) */}
          {interval !== null && (
            <div>
              <label className="block text-xs text-gray-500">간격</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                value={interval}
                onChange={e => {
                  const opt = { ...option, interval: Number(e.target.value) } as RepeatingOption
                  setOption(opt)
                  emit(opt)
                }}
              />
            </div>
          )}

          {/* 매주: 요일 체크박스 */}
          {weekOption && (
            <div>
              <p className="text-xs text-gray-500">요일</p>
              <div className="mt-1 flex gap-1">
                {DAYS.map((d, i) => (
                  <label key={i} className="flex flex-col items-center text-xs">
                    <input
                      type="checkbox"
                      checked={weekOption.dayOfWeek.includes(i)}
                      onChange={() => {
                        const days = weekOption.dayOfWeek.includes(i)
                          ? weekOption.dayOfWeek.filter(x => x !== i)
                          : [...weekOption.dayOfWeek, i]
                        const opt: RepeatingOption = { ...weekOption, dayOfWeek: days }
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 매월: 날짜/요일 모드 선택 */}
          {monthOption && (
            <div className="space-y-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="month-mode"
                    checked={monthMode === 'days'}
                    onChange={() => setMonthMode('days')}
                  />
                  날짜 지정
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="month-mode"
                    checked={monthMode === 'week'}
                    onChange={() => setMonthMode('week')}
                  />
                  요일 지정
                </label>
              </div>
              {monthMode === 'days' && (
                <div>
                  <label className="block text-xs text-gray-500">날짜</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    value={
                      'days' in monthOption.monthDaySelection
                        ? monthOption.monthDaySelection.days[0]
                        : 1
                    }
                    onChange={e => {
                      const opt: RepeatingOption = {
                        ...monthOption,
                        monthDaySelection: { days: [Number(e.target.value)] },
                      }
                      setOption(opt)
                      emit(opt)
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 매년 특정일 / 음력: 월+일 입력 */}
          {specificDayOption && (
            <div className="flex gap-3">
              <div>
                <label className="block text-xs text-gray-500">월</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={specificDayOption.month}
                  onChange={e => {
                    const opt = { ...specificDayOption, month: Number(e.target.value) } as RepeatingOption
                    setOption(opt)
                    emit(opt)
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">일</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={specificDayOption.day}
                  onChange={e => {
                    const opt = { ...specificDayOption, day: Number(e.target.value) } as RepeatingOption
                    setOption(opt)
                    emit(opt)
                  }}
                />
              </div>
            </div>
          )}

          {/* 종료 조건 */}
          <div>
            <label className="block text-xs text-gray-500">종료 조건</label>
            <div className="mt-1 flex gap-3">
              {(['none', 'date', 'count'] as const).map(t => (
                <label key={t} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="end-type"
                    checked={endType === t}
                    onChange={() => setEndType(t)}
                  />
                  {t === 'none' ? '없음' : t === 'date' ? '날짜' : '횟수'}
                </label>
              ))}
            </div>
            {endType === 'date' && (
              <input
                type="date"
                className="mt-2 rounded border border-gray-300 px-2 py-1 text-sm"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            )}
            {endType === 'count' && (
              <input
                type="number"
                min={1}
                className="mt-2 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                value={endCount}
                onChange={e => setEndCount(Number(e.target.value))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
