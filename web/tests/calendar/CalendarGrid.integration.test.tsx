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
    useCalendarEventsStore.setState({ eventsByDate: eventsMap, loading: false })
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
