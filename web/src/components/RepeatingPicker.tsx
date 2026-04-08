import { useState } from 'react'
import type { Repeating, RepeatingOption } from '../models'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // 월~일 display order
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const DAY_FULL_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

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
      return { optionType: 'every_year', interval: 1, months: [d.getMonth() + 1], weekOrdinals: [{ seq: 1, isLast: false }], dayOfWeek: [d.getDay()], timeZone: TZ }
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
  const [endType, setEndType] = useState<'none' | 'date' | 'count'>(() => {
    if (value?.end_count != null) return 'count'
    if (value?.end != null) return 'date'
    return 'none'
  })
  const [endDate, setEndDate] = useState(() => {
    if (value?.end != null) {
      const d = new Date(value.end * 1000)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
    }
    return ''
  })
  const [endCount, setEndCount] = useState(() => value?.end_count ?? 10)
  const [monthMode, setMonthMode] = useState<'days' | 'week'>(() => {
    if (value?.option.optionType === 'every_month') {
      return 'weekOrdinals' in value.option.monthDaySelection ? 'week' : 'days'
    }
    return 'days'
  })

  function emitWithEnd(opt: RepeatingOption, et: 'none' | 'date' | 'count', ed: string, ec: number) {
    const end = et === 'date' && ed ? Math.floor(new Date(ed + 'T00:00:00').getTime() / 1000) : undefined
    const end_count = et === 'count' ? ec : undefined
    onChange({ start: startTimestamp, option: opt, end, end_count })
  }

  function emit(opt: RepeatingOption) {
    emitWithEnd(opt, endType, endDate, endCount)
  }

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange(null)
    } else {
      emitWithEnd(option, endType, endDate, endCount)
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
  const yearOption = option.optionType === 'every_year' ? option : null
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
                  const opt = { ...option, interval: Math.max(1, Number(e.target.value) || 1) } as RepeatingOption
                  setOption(opt)
                  emit(opt)
                }}
              />
            </div>
          )}

          {/* 매주: 요일 체크박스 (월~일 순서) */}
          {weekOption && (
            <div>
              <p className="text-xs text-gray-500">요일</p>
              <div className="mt-1 flex gap-1">
                {DAY_ORDER.map(i => (
                  <div key={i} className="flex flex-col items-center text-xs">
                    <input
                      type="checkbox"
                      aria-label={DAY_FULL_LABELS[i]}
                      checked={weekOption.dayOfWeek.includes(i)}
                      onChange={() => {
                        const filtered = weekOption.dayOfWeek.filter(x => x !== i)
                        const days = weekOption.dayOfWeek.includes(i)
                          ? (filtered.length > 0 ? filtered : weekOption.dayOfWeek)
                          : [...weekOption.dayOfWeek, i]
                        const opt: RepeatingOption = { ...weekOption, dayOfWeek: days }
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                    <span aria-hidden="true">{DAY_LABELS[i]}</span>
                  </div>
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
              {monthMode === 'week' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500" htmlFor="month-week-seq">주차</label>
                    <input
                      id="month-week-seq"
                      type="number"
                      min={1}
                      max={5}
                      aria-label="주차"
                      className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      value={
                        'weekOrdinals' in monthOption.monthDaySelection &&
                        monthOption.monthDaySelection.weekOrdinals.length > 0
                          ? (monthOption.monthDaySelection.weekOrdinals[0].seq ?? 1)
                          : 1
                      }
                      onChange={e => {
                        const seq = Number(e.target.value)
                        const prevDays =
                          'weekDays' in monthOption.monthDaySelection
                            ? monthOption.monthDaySelection.weekDays
                            : []
                        const opt: RepeatingOption = {
                          ...monthOption,
                          monthDaySelection: {
                            weekOrdinals: [{ isLast: false, seq }],
                            weekDays: prevDays,
                          },
                        }
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">요일</p>
                    <div className="mt-1 flex gap-1">
                      {DAY_ORDER.map(i => {
                        const currentDays =
                          'weekDays' in monthOption.monthDaySelection
                            ? monthOption.monthDaySelection.weekDays
                            : []
                        return (
                          <div key={i} className="flex flex-col items-center text-xs">
                            <input
                              type="checkbox"
                              aria-label={DAY_FULL_LABELS[i]}
                              checked={currentDays.includes(i)}
                              onChange={() => {
                                const days = currentDays.includes(i)
                                  ? currentDays.filter(x => x !== i)
                                  : [...currentDays, i]
                                const currentOrdinals =
                                  'weekOrdinals' in monthOption.monthDaySelection
                                    ? monthOption.monthDaySelection.weekOrdinals
                                    : [{ isLast: false, seq: 1 }]
                                const opt: RepeatingOption = {
                                  ...monthOption,
                                  monthDaySelection: {
                                    weekOrdinals: currentOrdinals,
                                    weekDays: days,
                                  },
                                }
                                setOption(opt)
                                emit(opt)
                              }}
                            />
                            <span aria-hidden="true">{DAY_LABELS[i]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 매년: 월 + 주차 + 요일 입력 */}
          {yearOption && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500" htmlFor="year-month">월</label>
                <input
                  id="year-month"
                  type="number"
                  min={1}
                  max={12}
                  aria-label="월"
                  className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={yearOption.months[0] ?? 1}
                  onChange={e => {
                    const opt: RepeatingOption = { ...yearOption, months: [Number(e.target.value)] }
                    setOption(opt)
                    emit(opt)
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500" htmlFor="year-week-seq">주차</label>
                <input
                  id="year-week-seq"
                  type="number"
                  min={1}
                  max={5}
                  aria-label="주차"
                  className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={
                    yearOption.weekOrdinals.length > 0
                      ? (yearOption.weekOrdinals[0].seq ?? 1)
                      : 1
                  }
                  onChange={e => {
                    const seq = Number(e.target.value)
                    const opt: RepeatingOption = {
                      ...yearOption,
                      weekOrdinals: [{ isLast: false, seq }],
                    }
                    setOption(opt)
                    emit(opt)
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">요일</p>
                <div className="mt-1 flex gap-1">
                  {DAY_ORDER.map(i => (
                    <div key={i} className="flex flex-col items-center text-xs">
                      <input
                        type="checkbox"
                        aria-label={DAY_FULL_LABELS[i]}
                        checked={yearOption.dayOfWeek.includes(i)}
                        onChange={() => {
                          const days = yearOption.dayOfWeek.includes(i)
                            ? yearOption.dayOfWeek.filter(x => x !== i)
                            : [...yearOption.dayOfWeek, i]
                          if (days.length === 0) return
                          const opt: RepeatingOption = { ...yearOption, dayOfWeek: days }
                          setOption(opt)
                          emit(opt)
                        }}
                      />
                      <span aria-hidden="true">{DAY_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
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
                    onChange={() => {
                      setEndType(t)
                      emitWithEnd(option, t, endDate, endCount)
                    }}
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
                onChange={e => {
                  setEndDate(e.target.value)
                  emitWithEnd(option, endType, e.target.value, endCount)
                }}
              />
            )}
            {endType === 'count' && (
              <input
                type="number"
                min={1}
                className="mt-2 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                value={endCount}
                onChange={e => {
                  setEndCount(Number(e.target.value))
                  emitWithEnd(option, endType, endDate, Number(e.target.value))
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
