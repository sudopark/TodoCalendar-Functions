# Phase 3: 이벤트 태그 + 캘린더에 이벤트 표시 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캘린더 날짜 셀에 이벤트 컬러 dot, 공휴일 표시, 날짜 선택 하이라이트를 추가한다.

**Architecture:** 4개의 Zustand 스토어(eventTag, calendarEvents, holiday, ui)가 각각 독립적으로 API를 호출하고 상태를 관리한다. MonthCalendar가 월 변경 시 fetch를 트리거하고, CalendarGrid가 스토어 데이터를 조합하여 렌더링한다.

**Tech Stack:** React 19, Zustand, Vitest, React Testing Library, Tailwind CSS

---

## File Structure

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/stores/uiStore.ts` | selectedDate UI 상태 |
| `src/stores/eventTagStore.ts` | 이벤트 태그 전체 로드 + ID→태그 캐시 |
| `src/stores/calendarEventsStore.ts` | 월별 이벤트 fetch + 날짜별 그룹핑 |
| `src/stores/holidayStore.ts` | 연도별 공휴일 fetch + dateKey→공휴일명 매핑 |
| `tests/stores/uiStore.test.ts` | uiStore 테스트 |
| `tests/stores/eventTagStore.test.ts` | eventTagStore 테스트 |
| `tests/stores/calendarEventsStore.test.ts` | calendarEventsStore 테스트 |
| `tests/stores/holidayStore.test.ts` | holidayStore 테스트 |
| `tests/calendar/CalendarGrid.integration.test.tsx` | CalendarGrid + 스토어 통합 테스트 |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `src/calendar/CalendarGrid.tsx` | 이벤트 dot, 공휴일 표시, 선택 하이라이트, 클릭 핸들러 |
| `src/calendar/MonthCalendar.tsx` | 월 변경 시 fetch 트리거 + 스토어 연결 |
| `src/calendar/calendarUtils.ts` | `CalendarDay`에 `dateKey` 필드 추가 |
| `src/components/AuthGuard.tsx` | 로그인 완료 시 eventTagStore.fetchAll() 트리거 |

---

## Task 1: uiStore — selectedDate 상태

**Files:**
- Create: `web/src/stores/uiStore.ts`
- Create: `web/tests/stores/uiStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// web/tests/stores/uiStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedDate: null })
  })

  it('초기 상태에서 selectedDate는 null이다', () => {
    expect(useUiStore.getState().selectedDate).toBeNull()
  })

  it('setSelectedDate로 날짜를 설정할 수 있다', () => {
    const date = new Date(2026, 2, 15)
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toEqual(date)
  })

  it('같은 날짜를 다시 선택하면 선택이 해제된다', () => {
    const date = new Date(2026, 2, 15)
    useUiStore.getState().setSelectedDate(date)
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/stores/uiStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/stores/uiStore.ts
import { create } from 'zustand'

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

interface UiState {
  selectedDate: Date | null
  setSelectedDate: (date: Date) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: null,
  setSelectedDate: (date: Date) => {
    const current = get().selectedDate
    if (current && isSameDay(current, date)) {
      set({ selectedDate: null })
    } else {
      set({ selectedDate: date })
    }
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/stores/uiStore.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/stores/uiStore.ts web/tests/stores/uiStore.test.ts
git commit -m "[#104] Phase 3-1: uiStore — selectedDate 상태 관리"
```

---

## Task 2: eventTagStore — 태그 전체 로드 + ID 캐시

**Files:**
- Create: `web/src/stores/eventTagStore.ts`
- Create: `web/tests/stores/eventTagStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// web/tests/stores/eventTagStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn(),
  },
}))

describe('eventTagStore', () => {
  beforeEach(() => {
    useEventTagStore.setState({ tags: new Map() })
    vi.clearAllMocks()
  })

  it('초기 상태에서 tags는 빈 Map이다', () => {
    expect(useEventTagStore.getState().tags.size).toBe(0)
  })

  it('fetchAll 호출 시 태그를 ID→태그 Map으로 저장한다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
      { uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' },
    ])

    await useEventTagStore.getState().fetchAll()

    const tags = useEventTagStore.getState().tags
    expect(tags.size).toBe(2)
    expect(tags.get('tag-1')).toEqual({ uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' })
    expect(tags.get('tag-2')).toEqual({ uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' })
  })

  it('fetchAll 실패 시 tags는 빈 상태를 유지한다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockRejectedValue(new Error('network'))

    await useEventTagStore.getState().fetchAll()

    expect(useEventTagStore.getState().tags.size).toBe(0)
  })

  it('getColorForTagId로 태그 색상을 조회할 수 있다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])

    await useEventTagStore.getState().fetchAll()

    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBe('#ff0000')
    expect(useEventTagStore.getState().getColorForTagId('unknown')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/stores/eventTagStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/stores/eventTagStore.ts
import { create } from 'zustand'
import { eventTagApi } from '../api/eventTagApi'
import type { EventTag } from '../models'

interface EventTagState {
  tags: Map<string, EventTag>
  fetchAll: () => Promise<void>
  getColorForTagId: (id: string) => string | undefined
}

export const useEventTagStore = create<EventTagState>((set, get) => ({
  tags: new Map(),

  fetchAll: async () => {
    try {
      const list = await eventTagApi.getAllTags()
      const map = new Map<string, EventTag>()
      for (const tag of list) {
        map.set(tag.uuid, tag)
      }
      set({ tags: map })
    } catch (e) {
      console.warn('태그 로드 실패:', e)
    }
  },

  getColorForTagId: (id: string) => {
    return get().tags.get(id)?.color_hex ?? undefined
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/stores/eventTagStore.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/stores/eventTagStore.ts web/tests/stores/eventTagStore.test.ts
git commit -m "[#104] Phase 3-2: eventTagStore — 이벤트 태그 전체 로드 + ID→색상 조회"
```

---

## Task 3: holidayStore — 연도별 공휴일 캐시

**Files:**
- Create: `web/src/stores/holidayStore.ts`
- Create: `web/tests/stores/holidayStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// web/tests/stores/holidayStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHolidayStore } from '../../src/stores/holidayStore'

vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: {
    getHolidays: vi.fn(),
  },
}))

describe('holidayStore', () => {
  beforeEach(() => {
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('초기 상태에서 holidays는 빈 Map이다', () => {
    expect(useHolidayStore.getState().holidays.size).toBe(0)
  })

  it('fetchHolidays 호출 시 dateKey→공휴일명 배열로 저장한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({
      items: [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
        { summary: '삼일절', start: { date: '2026-03-01' }, end: { date: '2026-03-02' } },
      ],
    })

    await useHolidayStore.getState().fetchHolidays(2026)

    const holidays = useHolidayStore.getState().holidays
    expect(holidays.get('2026-01-01')).toEqual(['신정'])
    expect(holidays.get('2026-03-01')).toEqual(['삼일절'])
  })

  it('같은 연도를 다시 요청하면 API를 호출하지 않는다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({ items: [] })

    await useHolidayStore.getState().fetchHolidays(2026)
    await useHolidayStore.getState().fetchHolidays(2026)

    expect(holidayApi.getHolidays).toHaveBeenCalledTimes(1)
  })

  it('fetchHolidays 실패 시 기존 상태를 유지한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockRejectedValue(new Error('network'))

    await useHolidayStore.getState().fetchHolidays(2026)

    expect(useHolidayStore.getState().holidays.size).toBe(0)
  })

  it('getHolidayNames로 특정 날짜의 공휴일명을 조회한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({
      items: [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
      ],
    })

    await useHolidayStore.getState().fetchHolidays(2026)

    expect(useHolidayStore.getState().getHolidayNames('2026-01-01')).toEqual(['신정'])
    expect(useHolidayStore.getState().getHolidayNames('2026-01-02')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/stores/holidayStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/stores/holidayStore.ts
import { create } from 'zustand'
import { holidayApi } from '../api/holidayApi'

interface HolidayState {
  holidays: Map<string, string[]>
  loadedYears: Set<number>
  fetchHolidays: (year: number) => Promise<void>
  getHolidayNames: (dateKey: string) => string[]
}

export const useHolidayStore = create<HolidayState>((set, get) => ({
  holidays: new Map(),
  loadedYears: new Set(),

  fetchHolidays: async (year: number) => {
    if (get().loadedYears.has(year)) return
    try {
      const response = await holidayApi.getHolidays(year, 'ko', 'south_korea')
      const newHolidays = new Map(get().holidays)
      for (const item of response.items) {
        const dateKey = item.start.date
        const existing = newHolidays.get(dateKey) ?? []
        newHolidays.set(dateKey, [...existing, item.summary])
      }
      set({
        holidays: newHolidays,
        loadedYears: new Set(get().loadedYears).add(year),
      })
    } catch (e) {
      console.warn('공휴일 로드 실패:', e)
    }
  },

  getHolidayNames: (dateKey: string) => {
    return get().holidays.get(dateKey) ?? []
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/stores/holidayStore.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/stores/holidayStore.ts web/tests/stores/holidayStore.test.ts
git commit -m "[#104] Phase 3-3: holidayStore — 연도별 공휴일 캐시 + dateKey 조회"
```

---

## Task 4: calendarEventsStore — 월별 이벤트 fetch + 날짜별 그룹핑

**Files:**
- Create: `web/src/stores/calendarEventsStore.ts`
- Create: `web/tests/stores/calendarEventsStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// web/tests/stores/calendarEventsStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn() },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn() },
}))

describe('calendarEventsStore', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false })
    vi.clearAllMocks()
  })

  it('초기 상태에서 eventsByDate는 빈 Map이다', () => {
    expect(useCalendarEventsStore.getState().eventsByDate.size).toBe(0)
  })

  it('fetchEventsForRange 호출 시 날짜별로 이벤트를 그룹핑한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    vi.mocked(todoApi.getTodos).mockResolvedValue([
      {
        uuid: 'todo-1', name: 'Task', is_current: false,
        event_time: { time_type: 'at' as const, timestamp: 1743375600 }, // 2025-03-31 00:00:00 UTC
      },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      {
        uuid: 'sch-1', name: 'Meeting',
        event_time: { time_type: 'at' as const, timestamp: 1743375600 },
      },
    ])

    await useCalendarEventsStore.getState().fetchEventsForRange(1743292800, 1743465600)

    const events = useCalendarEventsStore.getState().eventsByDate
    expect(events.size).toBeGreaterThan(0)
  })

  it('fetchEventsForRange 호출 중 loading이 true가 된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    let resolveTodos: (v: any) => void
    vi.mocked(todoApi.getTodos).mockReturnValue(new Promise(r => { resolveTodos = r }))
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])

    const promise = useCalendarEventsStore.getState().fetchEventsForRange(0, 100)
    expect(useCalendarEventsStore.getState().loading).toBe(true)

    resolveTodos!([])
    await promise
    expect(useCalendarEventsStore.getState().loading).toBe(false)
  })

  it('fetchEventsForRange 실패 시 빈 Map을 유지하고 loading이 끝난다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    vi.mocked(todoApi.getTodos).mockRejectedValue(new Error('network'))
    vi.mocked(scheduleApi.getSchedules).mockRejectedValue(new Error('network'))

    await useCalendarEventsStore.getState().fetchEventsForRange(0, 100)

    expect(useCalendarEventsStore.getState().eventsByDate.size).toBe(0)
    expect(useCalendarEventsStore.getState().loading).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/stores/calendarEventsStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/stores/calendarEventsStore.ts
import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { groupEventsByDate } from '../utils/eventTimeUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  fetchEventsForRange: (lower: number, upper: number) => Promise<void>
}

export const useCalendarEventsStore = create<CalendarEventsState>((set) => ({
  eventsByDate: new Map(),
  loading: false,

  fetchEventsForRange: async (lower: number, upper: number) => {
    set({ loading: true })
    try {
      const [todos, schedules] = await Promise.all([
        todoApi.getTodos(lower, upper),
        scheduleApi.getSchedules(lower, upper),
      ])
      const eventsByDate = groupEventsByDate(todos, schedules, lower, upper)
      set({ eventsByDate, loading: false })
    } catch (e) {
      console.warn('이벤트 로드 실패:', e)
      set({ loading: false })
    }
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/stores/calendarEventsStore.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/stores/calendarEventsStore.ts web/tests/stores/calendarEventsStore.test.ts
git commit -m "[#104] Phase 3-4: calendarEventsStore — 월별 이벤트 fetch + 날짜별 그룹핑"
```

---

## Task 5: calendarUtils에 dateKey 추가 + CalendarGrid에 이벤트 dot, 공휴일, 선택 하이라이트

**Files:**
- Modify: `web/src/calendar/calendarUtils.ts` — `CalendarDay`에 `dateKey` 추가
- Modify: `web/src/calendar/CalendarGrid.tsx` — 이벤트 dot, 공휴일, 선택, 클릭
- Modify: `web/tests/calendar/CalendarGrid.test.tsx` — 기존 테스트 유지 + props 업데이트
- Create: `web/tests/calendar/CalendarGrid.integration.test.tsx` — 스토어 연동 테스트

- [ ] **Step 1: calendarUtils에 dateKey 추가**

`calendarUtils.ts`의 `CalendarDay` 인터페이스에 `dateKey: string` 필드를 추가하고, `buildCalendarGrid`에서 `formatDateKey`를 사용하여 각 날짜에 dateKey를 세팅한다.

```ts
// calendarUtils.ts — CalendarDay 수정
export interface CalendarDay {
  date: Date
  dayOfMonth: number
  dateKey: string          // "YYYY-MM-DD"
  isCurrentMonth: boolean
  isToday: boolean
}
```

`buildCalendarGrid` 내 날짜 생성 루프에서:

```ts
import { formatDateKey } from '../utils/eventTimeUtils'

// ... for loop 내부
days.push({
  date,
  dayOfMonth: date.getDate(),
  dateKey: formatDateKey(date),
  isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
  isToday: isSameDay(date, today),
})
```

- [ ] **Step 2: CalendarGrid 수정 — 이벤트 dot, 공휴일, 선택, 클릭**

```tsx
// web/src/calendar/CalendarGrid.tsx
import type { CalendarDay } from './calendarUtils'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { useEventTagStore } from '../stores/eventTagStore'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarGridProps {
  days: CalendarDay[]
}

export default function CalendarGrid({ days }: CalendarGridProps) {
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)

  return (
    <div className="grid grid-cols-7">
      {WEEKDAYS.map((day, i) => (
        <div
          key={day}
          className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : 'text-gray-500'}`}
        >
          {day}
        </div>
      ))}
      {days.map((day, i) => {
        const isSelected = selectedDate
          && selectedDate.getFullYear() === day.date.getFullYear()
          && selectedDate.getMonth() === day.date.getMonth()
          && selectedDate.getDate() === day.date.getDate()
        const holidayNames = getHolidayNames(day.dateKey)
        const isHoliday = holidayNames.length > 0
        const isSunday = day.date.getDay() === 0

        const events = eventsByDate.get(day.dateKey) ?? []
        const dotColors: string[] = []
        for (const ev of events.slice(0, 3)) {
          const tagId = ev.type === 'todo' ? ev.event.event_tag_id : ev.event.event_tag_id
          const color = tagId ? getColorForTagId(tagId) : undefined
          dotColors.push(color ?? '#9ca3af')
        }

        const textColor = day.isToday
          ? 'font-semibold text-white'
          : !day.isCurrentMonth
            ? 'text-gray-300'
            : (isHoliday || isSunday)
              ? 'text-red-500'
              : 'text-gray-900'

        const bgClass = day.isToday ? 'bg-blue-500 rounded-full' : ''
        const selectedClass = isSelected && !day.isToday ? 'ring-2 ring-blue-400 rounded-full' : ''

        return (
          <div
            key={i}
            className="flex flex-col items-center py-1 cursor-pointer"
            data-testid="day-cell"
            onClick={() => setSelectedDate(day.date)}
            title={holidayNames.join(', ') || undefined}
          >
            <div className={`flex h-7 w-7 items-center justify-center text-sm ${textColor} ${bgClass} ${selectedClass}`}>
              {day.dayOfMonth}
            </div>
            {dotColors.length > 0 && (
              <div className="mt-0.5 flex gap-0.5" data-testid="event-dots">
                {dotColors.map((color, j) => (
                  <span
                    key={j}
                    className="inline-block h-1 w-1 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: 기존 CalendarGrid 테스트 업데이트**

기존 테스트는 스토어에 의존하게 되므로, 스토어를 모킹한다.

```tsx
// web/tests/calendar/CalendarGrid.test.tsx 상단에 추가
vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: vi.fn((selector) => {
    const state = { selectedDate: null, setSelectedDate: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/calendarEventsStore', () => ({
  useCalendarEventsStore: vi.fn((selector) => {
    const state = { eventsByDate: new Map() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/holidayStore', () => ({
  useHolidayStore: vi.fn((selector) => {
    const state = { getHolidayNames: () => [] }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/eventTagStore', () => ({
  useEventTagStore: vi.fn((selector) => {
    const state = { getColorForTagId: () => undefined }
    return selector(state)
  }),
}))
```

기존 `import` 에 `vi`를 추가하고, 일부 어서션에서 구조 변경(셀 내부에 div 추가)을 반영해야 할 수 있다. `data-testid="day-cell"` 기준이므로 큰 변경은 없다.

- [ ] **Step 4: CalendarGrid 통합 테스트 작성**

```tsx
// web/tests/calendar/CalendarGrid.integration.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CalendarGrid from '../../src/calendar/CalendarGrid'
import { buildCalendarGrid } from '../../src/calendar/calendarUtils'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useHolidayStore } from '../../src/stores/holidayStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn() },
}))
vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: vi.fn() },
}))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn() },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn() },
}))

const today = new Date(2026, 2, 15)
const marchDays = buildCalendarGrid(2026, 2, today)

describe('CalendarGrid 통합', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedDate: null })
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false })
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    useEventTagStore.setState({ tags: new Map() })
  })

  it('날짜 셀 클릭 시 selectedDate가 설정된다', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid days={marchDays} />)

    const cells = screen.getAllByTestId('day-cell')
    const march10Index = marchDays.findIndex(d => d.isCurrentMonth && d.dayOfMonth === 10)
    await user.click(cells[march10Index])

    const selected = useUiStore.getState().selectedDate
    expect(selected?.getDate()).toBe(10)
    expect(selected?.getMonth()).toBe(2)
  })

  it('이벤트가 있는 날짜에 dot이 표시된다', () => {
    const eventsMap = new Map<string, any[]>()
    eventsMap.set('2026-03-10', [
      { type: 'todo', event: { uuid: 't1', name: 'Task', is_current: false, event_tag_id: 'tag-1', event_time: { time_type: 'at', timestamp: 0 } } },
    ])
    useCalendarEventsStore.setState({ eventsByDate: eventsMap })
    useEventTagStore.setState({
      tags: new Map([['tag-1', { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' }]]),
    })

    render(<CalendarGrid days={marchDays} />)

    const dots = screen.getAllByTestId('event-dots')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('공휴일 날짜에 빨간 텍스트가 표시된다', () => {
    const holidays = new Map<string, string[]>()
    holidays.set('2026-03-01', ['삼일절'])
    useHolidayStore.setState({ holidays, loadedYears: new Set([2026]) })

    render(<CalendarGrid days={marchDays} />)

    const cells = screen.getAllByTestId('day-cell')
    const march1Index = marchDays.findIndex(d => d.isCurrentMonth && d.dayOfMonth === 1)
    const march1Cell = cells[march1Index]
    const numberEl = march1Cell.querySelector('div')
    expect(numberEl?.classList.contains('text-red-500')).toBe(true)
  })

  it('선택된 날짜에 ring 하이라이트가 표시된다', () => {
    useUiStore.setState({ selectedDate: new Date(2026, 2, 10) })

    render(<CalendarGrid days={marchDays} />)

    const cells = screen.getAllByTestId('day-cell')
    const march10Index = marchDays.findIndex(d => d.isCurrentMonth && d.dayOfMonth === 10)
    const numberEl = cells[march10Index].querySelector('div')
    expect(numberEl?.classList.contains('ring-2')).toBe(true)
  })
})
```

- [ ] **Step 5: Run all tests**

Run: `cd web && npx vitest run`
Expected: 기존 테스트 + 신규 통합 테스트 전부 PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/calendar/calendarUtils.ts web/src/calendar/CalendarGrid.tsx \
  web/tests/calendar/CalendarGrid.test.tsx web/tests/calendar/CalendarGrid.integration.test.tsx
git commit -m "[#104] Phase 3-5: CalendarGrid — 이벤트 dot, 공휴일 빨간 텍스트, 선택 하이라이트"
```

---

## Task 6: MonthCalendar — 월 변경 시 fetch 트리거

**Files:**
- Modify: `web/src/calendar/MonthCalendar.tsx`
- Modify: `web/tests/calendar/MonthCalendar.test.tsx`

- [ ] **Step 1: MonthCalendar에 fetch 연동**

```tsx
// web/src/calendar/MonthCalendar.tsx
import { useState, useMemo, useEffect } from 'react'
import { buildCalendarGrid, navigateMonth } from './calendarUtils'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { monthRange } from '../utils/eventTimeUtils'

interface MonthCalendarProps {
  today?: Date
}

export default function MonthCalendar({ today = new Date() }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const fetchEventsForRange = useCalendarEventsStore(s => s.fetchEventsForRange)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  useEffect(() => {
    const range = monthRange(year, month)
    fetchEventsForRange(range.lower, range.upper)
    fetchHolidays(year)
  }, [year, month, fetchEventsForRange, fetchHolidays])

  const goToPrev = () => setCurrentMonth(prev => navigateMonth(prev, -1))
  const goToNext = () => setCurrentMonth(prev => navigateMonth(prev, 1))

  return (
    <div className="mx-auto max-w-md p-4">
      <CalendarHeader year={year} month={month} onPrev={goToPrev} onNext={goToNext} />
      <CalendarGrid days={days} />
    </div>
  )
}
```

- [ ] **Step 2: MonthCalendar 테스트 업데이트**

기존 테스트에 스토어 모킹 추가. CalendarGrid가 스토어를 사용하므로 모킹 필요:

```tsx
// web/tests/calendar/MonthCalendar.test.tsx 상단에 추가
vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: vi.fn((selector) => {
    const state = { selectedDate: null, setSelectedDate: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/calendarEventsStore', () => ({
  useCalendarEventsStore: vi.fn((selector) => {
    const state = { eventsByDate: new Map(), fetchEventsForRange: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/holidayStore', () => ({
  useHolidayStore: vi.fn((selector) => {
    const state = { getHolidayNames: () => [], fetchHolidays: vi.fn() }
    return selector(state)
  }),
}))
vi.mock('../../src/stores/eventTagStore', () => ({
  useEventTagStore: vi.fn((selector) => {
    const state = { getColorForTagId: () => undefined }
    return selector(state)
  }),
}))
```

기존 `import`에 `vi`를 추가.

- [ ] **Step 3: Run all tests**

Run: `cd web && npx vitest run`
Expected: 전체 PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/calendar/MonthCalendar.tsx web/tests/calendar/MonthCalendar.test.tsx
git commit -m "[#104] Phase 3-6: MonthCalendar — 월 변경 시 이벤트+공휴일 fetch 트리거"
```

---

## Task 7: AuthGuard에서 태그 로드 트리거

**Files:**
- Modify: `web/src/components/AuthGuard.tsx`
- Modify: `web/tests/components/AuthGuard.test.tsx`

- [ ] **Step 1: AuthGuard.tsx 읽고 현재 구조 확인**

현재 AuthGuard는 `useAuthStore`의 `account`와 `loading`을 체크하여 로그인 상태를 결정한다.

- [ ] **Step 2: AuthGuard에 eventTagStore.fetchAll() 트리거 추가**

로그인 상태 확인 후 account가 존재하면 `useEventTagStore.getState().fetchAll()`을 호출한다. `useEffect`를 사용:

```tsx
import { useEffect } from 'react'
import { useEventTagStore } from '../stores/eventTagStore'

// ... 기존 코드 내부, account가 있을 때
useEffect(() => {
  if (account) {
    useEventTagStore.getState().fetchAll()
  }
}, [account])
```

- [ ] **Step 3: AuthGuard 기존 테스트에 eventTagStore 모킹 추가**

```tsx
vi.mock('../../src/stores/eventTagStore', () => ({
  useEventTagStore: { getState: () => ({ fetchAll: vi.fn() }) },
}))
```

- [ ] **Step 4: Run all tests**

Run: `cd web && npx vitest run`
Expected: 전체 PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/AuthGuard.tsx web/tests/components/AuthGuard.test.tsx
git commit -m "[#104] Phase 3-7: AuthGuard — 로그인 시 이벤트 태그 로드 트리거"
```

---

## Task 8: 전체 검증 + TODO 업데이트

**Files:**
- Modify: `docs/web/TODO.md` — Phase 3 체크리스트 업데이트

- [ ] **Step 1: tsc 타입 체크**

Run: `cd web && npx tsc -b`
Expected: 에러 없음

- [ ] **Step 2: 전체 테스트**

Run: `cd web && npx vitest run`
Expected: 전체 PASS (기존 66 + 신규 스토어 12 + 통합 4 = ~82개)

- [ ] **Step 3: TODO.md Phase 3 체크리스트 업데이트**

Phase 3 항목들을 `[x]`로 체크.

- [ ] **Step 4: Commit**

```bash
git add docs/web/TODO.md
git commit -m "[#104] Phase 3 TODO 체크리스트 업데이트"
```
