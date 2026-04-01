import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ScheduleFormPage } from '../../src/pages/ScheduleFormPage'

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    excludeRepeating: vi.fn(),
    deleteSchedule: vi.fn(),
  },
}))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/stores/uiStore', () => ({ useUiStore: vi.fn() }))
vi.mock('../../src/stores/calendarEventsStore', () => ({ useCalendarEventsStore: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useEventTagStore } from '../../src/stores/eventTagStore'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'

const mockAddEvent = vi.fn()
const mockRemoveEvent = vi.fn()
const mockReplaceEvent = vi.fn()
const mockRefreshCurrentRange = vi.fn()

function setupMocks() {
  vi.mocked(useEventTagStore).mockImplementation((sel: any) => sel({ tags: new Map(), getColorForTagId: () => null }))
  vi.mocked(useUiStore).mockImplementation((sel: any) => sel({ selectedDate: new Date('2025-03-31') }))
  const calendarState = {
    addEvent: mockAddEvent,
    removeEvent: mockRemoveEvent,
    replaceEvent: mockReplaceEvent,
    refreshCurrentRange: mockRefreshCurrentRange,
  }
  vi.mocked(useCalendarEventsStore).mockImplementation((sel?: any) =>
    sel ? sel(calendarState) : calendarState
  )
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/schedules/new']}>
      <Routes><Route path="/schedules/new" element={<ScheduleFormPage />} /></Routes>
    </MemoryRouter>
  )
}

function renderEdit(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/schedules/${id}/edit`]}>
      <Routes><Route path="/schedules/:id/edit" element={<ScheduleFormPage />} /></Routes>
    </MemoryRouter>
  )
}

describe('ScheduleFormPage — create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('"새 Schedule" 제목을 표시한다', () => {
    renderCreate()
    expect(screen.getByText('새 Schedule')).toBeInTheDocument()
  })

  it('이름 입력 후 저장하면 createSchedule이 호출되고 화면을 닫는다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.createSchedule).mockResolvedValue({
      uuid: 'new-1', name: '회의', event_time: { time_type: 'at', timestamp: 1743375600 },
    })
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '회의')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('이름이 비어 있으면 저장 버튼을 클릭해도 API가 호출되지 않는다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    renderCreate()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(scheduleApi.createSchedule).not.toHaveBeenCalled()
  })
})

describe('ScheduleFormPage — edit (반복)', () => {
  const repeatingSch = {
    uuid: 'sch-1',
    name: '주간 미팅',
    event_time: { time_type: 'at' as const, timestamp: 1743375600 },
    repeating: { start: 1743375600, option: { optionType: 'every_week' as const, interval: 1, dayOfWeek: [1], timeZone: 'Asia/Seoul' } },
    show_turns: [3],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('기존 schedule을 불러와 이름 필드에 표시한다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(repeatingSch as any)
    renderEdit('sch-1')
    await waitFor(() => expect(screen.getByDisplayValue('주간 미팅')).toBeInTheDocument())
  })

  it('반복 Schedule 수정 시 scope 선택 다이얼로그가 표시된다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(repeatingSch as any)
    renderEdit('sch-1')
    await waitFor(() => screen.getByDisplayValue('주간 미팅'))
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByText('반복 일정 수정')).toBeInTheDocument()
  })

  it('반복 Schedule 삭제 시 scope 선택 다이얼로그가 표시된다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(repeatingSch as any)
    renderEdit('sch-1')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText('반복 일정 삭제')).toBeInTheDocument()
  })

  it('비반복 Schedule 삭제 시 확인 다이얼로그가 표시된다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const simpleSch = { uuid: 'sch-2', name: '단순 일정', event_time: { time_type: 'at' as const, timestamp: 1743375600 } }
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(simpleSch as any)
    renderEdit('sch-2')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText(/삭제할까요/)).toBeInTheDocument()
  })
})
