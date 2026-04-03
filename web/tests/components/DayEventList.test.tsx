import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DayEventList } from '../../src/components/DayEventList'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/stores/calendarEventsStore', () => ({ useCalendarEventsStore: vi.fn() }))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderComponent(selectedDate: Date | null = null) {
  return render(
    <MemoryRouter>
      <DayEventList selectedDate={selectedDate} />
    </MemoryRouter>
  )
}

function mockCalendarEventsStore(eventsByDate: Map<string, any[]>) {
  vi.mocked(useCalendarEventsStore).mockImplementation((selector: any) => selector({ eventsByDate }))
}

function mockEventTagStore(colorMap: Record<string, string> = {}) {
  vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
    selector({ getColorForTagId: (id: string) => colorMap[id] ?? null })
  )
}

describe('DayEventList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEventTagStore()
  })

  it('날짜가 선택되지 않으면 아무것도 표시하지 않는다', () => {
    mockCalendarEventsStore(new Map())

    const { container } = renderComponent(null)

    expect(container.firstChild).toBeNull()
  })

  it('선택된 날짜에 이벤트가 없으면 안내 메시지를 표시한다', () => {
    mockCalendarEventsStore(new Map())

    renderComponent(new Date(2024, 2, 15))

    expect(screen.getByText('이벤트가 없습니다')).toBeInTheDocument()
  })

  it('Todo와 Schedule 이벤트를 Todo 먼저, Schedule 순으로 표시한다', () => {
    const todo = { uuid: 't1', name: '할 일', is_current: false, event_time: null }
    const schedule = { uuid: 's1', name: '일정', event_time: { time_type: 'at' as const, timestamp: 1710480600 } }
    const eventsByDate = new Map([
      ['2024-03-15', [
        { type: 'schedule' as const, event: schedule },
        { type: 'todo' as const, event: todo },
      ]],
    ])

    mockCalendarEventsStore(eventsByDate)

    renderComponent(new Date(2024, 2, 15))

    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveTextContent('할 일')
    expect(listItems[1]).toHaveTextContent('일정')
  })

  it('이벤트를 클릭하면 해당 이벤트 상세 페이지로 이동한다', async () => {
    const todo = { uuid: 'todo-abc', name: '상세 확인 할 일', is_current: false, event_time: null }
    const eventsByDate = new Map([
      ['2024-03-15', [{ type: 'todo' as const, event: todo }]],
    ])

    mockCalendarEventsStore(eventsByDate)

    renderComponent(new Date(2024, 2, 15))
    await userEvent.click(screen.getByRole('button', { name: /상세 확인 할 일/ }))

    expect(mockNavigate).toHaveBeenCalled()
  })
})

describe('DayEventList — 편집 메뉴', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEventTagStore()
  })

  it('이벤트 아이템에 "···" 메뉴 버튼이 표시된다', () => {
    const todo = { uuid: 't1', name: '할 일', is_current: false, event_time: null }
    mockCalendarEventsStore(new Map([['2024-03-15', [{ type: 'todo' as const, event: todo }]]]))
    renderComponent(new Date(2024, 2, 15))
    expect(screen.getByRole('button', { name: '메뉴' })).toBeInTheDocument()
  })

  it('"···" 메뉴 클릭 시 수정 옵션이 표시된다', async () => {
    const todo = { uuid: 't1', name: '할 일', is_current: false, event_time: null }
    mockCalendarEventsStore(new Map([['2024-03-15', [{ type: 'todo' as const, event: todo }]]]))
    renderComponent(new Date(2024, 2, 15))
    await userEvent.click(screen.getByRole('button', { name: '메뉴' }))
    expect(screen.getByText('수정')).toBeInTheDocument()
  })
})
