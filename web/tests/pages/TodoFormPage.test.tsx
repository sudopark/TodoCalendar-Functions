import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TodoFormPage } from '../../src/pages/TodoFormPage'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    getTodo: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
  },
}))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/stores/uiStore', () => ({ useUiStore: vi.fn() }))
vi.mock('../../src/stores/calendarEventsStore', () => ({ useCalendarEventsStore: vi.fn() }))
vi.mock('../../src/stores/currentTodosStore', () => ({ useCurrentTodosStore: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useEventTagStore } from '../../src/stores/eventTagStore'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'

const mockAddEvent = vi.fn()
const mockRemoveEvent = vi.fn()
const mockReplaceEvent = vi.fn()
const mockRefreshCurrentRange = vi.fn()
const mockAddTodo = vi.fn()
const mockRemoveTodo = vi.fn()
const mockReplaceTodo = vi.fn()

function setupMocks() {
  vi.mocked(useEventTagStore).mockImplementation((sel: any) => sel({ tags: new Map(), getColorForTagId: () => null }))
  vi.mocked(useUiStore).mockImplementation((sel: any) => sel({ selectedDate: null }))
  const calendarState = { addEvent: mockAddEvent, removeEvent: mockRemoveEvent, replaceEvent: mockReplaceEvent, refreshCurrentRange: mockRefreshCurrentRange }
  vi.mocked(useCalendarEventsStore).mockImplementation((sel?: any) =>
    sel ? sel(calendarState) : calendarState
  )
  const todosState = { addTodo: mockAddTodo, removeTodo: mockRemoveTodo, replaceTodo: mockReplaceTodo }
  vi.mocked(useCurrentTodosStore).mockImplementation((sel?: any) =>
    sel ? sel(todosState) : todosState
  )
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/todos/new']}>
      <Routes><Route path="/todos/new" element={<TodoFormPage />} /></Routes>
    </MemoryRouter>
  )
}

function renderEdit(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/todos/${id}/edit`]}>
      <Routes><Route path="/todos/:id/edit" element={<TodoFormPage />} /></Routes>
    </MemoryRouter>
  )
}

describe('TodoFormPage — create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('"새 Todo" 제목을 표시한다', () => {
    renderCreate()
    expect(screen.getByText('새 Todo')).toBeInTheDocument()
  })

  it('이름을 입력하고 저장하면 createTodo가 호출되고 화면을 닫는다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.createTodo).mockResolvedValue({ uuid: 'new-1', name: '테스트', is_current: false })
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '테스트')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('이름이 비어 있으면 저장 버튼을 클릭해도 API가 호출되지 않는다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    renderCreate()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(todoApi.createTodo).not.toHaveBeenCalled()
  })
})

describe('TodoFormPage — edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('기존 todo를 불러와 이름 필드에 표시한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '기존 이름', is_current: false })
    renderEdit('todo-1')
    await waitFor(() => expect(screen.getByDisplayValue('기존 이름')).toBeInTheDocument())
  })

  it('삭제 버튼 클릭 시 확인 다이얼로그가 표시된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '할 일', is_current: false })
    renderEdit('todo-1')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText(/정말 삭제/)).toBeInTheDocument()
  })

  it('수정 후 navigate가 호출된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '기존 이름', is_current: false, event_time: null })
    vi.mocked(todoApi.updateTodo).mockResolvedValue({ uuid: 'todo-1', name: '수정됨', is_current: false, event_time: null })
    renderEdit('todo-1')
    await waitFor(() => screen.getByDisplayValue('기존 이름'))
    await userEvent.clear(screen.getByLabelText('이름'))
    await userEvent.type(screen.getByLabelText('이름'), '수정됨')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('삭제 확인 후 navigate가 호출된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '할 일', is_current: false, event_time: null })
    vi.mocked(todoApi.deleteTodo).mockResolvedValue(undefined as any)
    renderEdit('todo-1')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    // ConfirmDialog 열린 후 두 개의 "삭제" 버튼 중 마지막(다이얼로그 확인) 버튼 클릭
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' })
    await userEvent.click(deleteButtons[deleteButtons.length - 1])
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})
