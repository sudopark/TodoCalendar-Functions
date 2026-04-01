# Phase 6: Done Todos + EventDetail 편집 + 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Done Todos 무한 스크롤 페이지, EventDetailPage 인라인 편집 + Foremost 토글, 설정 페이지(기본 태그 색상/계정 관리)를 구현하고 상단 Header 네비게이션으로 연결한다.

**Architecture:** Zustand 스토어(`doneTodosStore`)를 신규 생성해 커서 기반 페이지네이션을 관리하고, `foremostEventStore`에 set/remove 액션을 추가한다. Header 컴포넌트를 AuthGuard 내부에 배치해 보호된 모든 라우트에서 표시한다.

**Tech Stack:** React 19, TypeScript, Zustand, React Router v6, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| 역할 | 파일 | 신규/수정 |
|------|------|---------|
| 상단 네비게이션 | `web/src/components/Header.tsx` | 신규 |
| 라우팅 추가 | `web/src/App.tsx` | 수정 |
| Foremost set/remove | `web/src/stores/foremostEventStore.ts` | 수정 |
| Done Todos 상태 | `web/src/stores/doneTodosStore.ts` | 신규 |
| 삭제 확인 다이얼로그 | `web/src/components/ConfirmDialog.tsx` | 신규 |
| Done Todos 페이지 | `web/src/pages/DoneTodosPage.tsx` | 신규 |
| EventDetail 편집 + Foremost | `web/src/pages/EventDetailPage.tsx` | 수정 |
| 계정 삭제 API | `web/src/api/accountApi.ts` | 신규 |
| 색상 팔레트 컴포넌트 | `web/src/components/ColorPalette.tsx` | 신규 |
| 설정 페이지 | `web/src/pages/SettingsPage.tsx` | 신규 |

---

## Task 1: Header 컴포넌트 + 라우팅

**Files:**
- Create: `web/src/components/Header.tsx`
- Modify: `web/src/App.tsx`
- Create: `web/tests/components/Header.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// web/tests/components/Header.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../../src/components/Header'

describe('Header', () => {
  function renderHeader(path = '/') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>
    )
  }

  it('캘린더, Done, 설정 탭 링크를 렌더한다', () => {
    // given / when
    renderHeader('/')

    // then
    expect(screen.getByRole('link', { name: '캘린더' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '설정' })).toBeInTheDocument()
  })

  it('/ 경로에서 캘린더 탭이 active 클래스를 갖는다', () => {
    // given / when
    renderHeader('/')

    // then
    expect(screen.getByRole('link', { name: '캘린더' })).toHaveClass('bg-gray-100')
    expect(screen.getByRole('link', { name: 'Done' })).not.toHaveClass('bg-gray-100')
  })

  it('/done 경로에서 Done 탭이 active 클래스를 갖는다', () => {
    // given / when
    renderHeader('/done')

    // then
    expect(screen.getByRole('link', { name: 'Done' })).toHaveClass('bg-gray-100')
    expect(screen.getByRole('link', { name: '캘린더' })).not.toHaveClass('bg-gray-100')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/components/Header.test.tsx
```
Expected: FAIL (Header not found)

- [ ] **Step 3: Header 컴포넌트 구현**

```tsx
// web/src/components/Header.tsx
import { NavLink } from 'react-router-dom'

export function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
      <span className="text-sm font-bold text-gray-900">TodoCalendar</span>
      <nav className="flex gap-1">
        <NavLink to="/" end className={linkClass}>캘린더</NavLink>
        <NavLink to="/done" className={linkClass}>Done</NavLink>
        <NavLink to="/settings" className={linkClass}>설정</NavLink>
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: App.tsx에 Header + 신규 라우트 추가**

기존 `AppRoutes`의 `AuthGuard` 블록을 아래로 교체한다. `DoneTodosPage`, `SettingsPage`는 이후 Task에서 구현하므로 임시로 `<div>`로 placeholder 처리.

```tsx
// web/src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { Header } from './components/Header'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'
import { EventDetailPage } from './pages/EventDetailPage'

function AppRoutes() {
  const location = useLocation()
  const background = (location.state as { background?: typeof location } | null)?.background

  return (
    <>
      <Routes location={background ?? location}>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Header />
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/done" element={<div className="p-8 text-gray-400 text-sm">준비 중</div>} />
                <Route path="/settings" element={<div className="p-8 text-gray-400 text-sm">준비 중</div>} />
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>

      {background && (
        <Routes>
          <Route
            path="/events/:id"
            element={
              <AuthGuard>
                <EventDetailPage />
              </AuthGuard>
            }
          />
        </Routes>
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/components/Header.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 6: 전체 테스트 이상 없음 확인**

```bash
cd web && npm test -- --run
```
Expected: 기존 테스트 전체 PASS

- [ ] **Step 7: 커밋**

```bash
git add web/src/components/Header.tsx web/src/App.tsx web/tests/components/Header.test.tsx
git commit -m "[#104] Phase 6-1: Header 네비게이션 + 라우팅 추가"
```

---

## Task 2: foremostEventStore — set/remove 액션 추가

**Files:**
- Modify: `web/src/stores/foremostEventStore.ts`
- Modify: `web/tests/stores/foremostEventStore.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

기존 `web/tests/stores/foremostEventStore.test.ts`에 테스트 추가:

```ts
// 파일 상단 vi.mock에 setForemostEvent, removeForemostEvent 추가
vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: {
    getForemostEvent: vi.fn(),
    setForemostEvent: vi.fn(),
    removeForemostEvent: vi.fn(),
  },
}))

// 파일 하단에 추가
it('setForemost 호출 시 foremostEvent가 API 응답으로 갱신된다', async () => {
  // given
  const event = { event_id: 'e1', is_todo: true, event: { uuid: 'e1', name: '할 일', is_current: false } }
  vi.mocked(foremostApi.setForemostEvent).mockResolvedValue(event as any)

  // when
  await useForemostEventStore.getState().setForemost('e1', true)

  // then
  expect(useForemostEventStore.getState().foremostEvent).toEqual(event)
})

it('removeForemost 호출 시 foremostEvent가 null이 된다', async () => {
  // given
  useForemostEventStore.setState({ foremostEvent: { event_id: 'e1', is_todo: true } as any })
  vi.mocked(foremostApi.removeForemostEvent).mockResolvedValue({ status: 'ok' })

  // when
  await useForemostEventStore.getState().removeForemost()

  // then
  expect(useForemostEventStore.getState().foremostEvent).toBeNull()
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/stores/foremostEventStore.test.ts
```
Expected: FAIL (setForemost/removeForemost not a function)

- [ ] **Step 3: 스토어에 액션 추가**

```ts
// web/src/stores/foremostEventStore.ts
import { create } from 'zustand'
import { foremostApi } from '../api/foremostApi'
import type { ForemostEvent } from '../models'

interface ForemostEventState {
  foremostEvent: ForemostEvent | null
  fetch: () => Promise<void>
  setForemost: (eventId: string, isTodo: boolean) => Promise<void>
  removeForemost: () => Promise<void>
}

export const useForemostEventStore = create<ForemostEventState>((set) => ({
  foremostEvent: null,

  fetch: async () => {
    try {
      const event = await foremostApi.getForemostEvent()
      set({ foremostEvent: event })
    } catch (e) {
      console.warn('Foremost event 로드 실패:', e)
      set({ foremostEvent: null })
    }
  },

  setForemost: async (eventId: string, isTodo: boolean) => {
    try {
      const event = await foremostApi.setForemostEvent({ event_id: eventId, is_todo: isTodo })
      set({ foremostEvent: event })
    } catch (e) {
      console.warn('Foremost 설정 실패:', e)
    }
  },

  removeForemost: async () => {
    try {
      await foremostApi.removeForemostEvent()
      set({ foremostEvent: null })
    } catch (e) {
      console.warn('Foremost 해제 실패:', e)
    }
  },
}))
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/stores/foremostEventStore.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add web/src/stores/foremostEventStore.ts web/tests/stores/foremostEventStore.test.ts
git commit -m "[#104] Phase 6-2: foremostEventStore set/remove 액션 추가"
```

---

## Task 3: doneTodosStore

**Files:**
- Create: `web/src/stores/doneTodosStore.ts`
- Create: `web/tests/stores/doneTodosStore.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// web/tests/stores/doneTodosStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDoneTodosStore } from '../../src/stores/doneTodosStore'
import { doneTodoApi } from '../../src/api/doneTodoApi'

vi.mock('../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(),
    deleteDoneTodo: vi.fn(),
    revertDoneTodo: vi.fn(),
  },
}))

const makeDone = (id: string, done_at = 1000) => ({
  uuid: id,
  name: `done-${id}`,
  done_at,
  origin_event_id: null,
  event_time: null,
  event_tag_id: null,
})

describe('useDoneTodosStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDoneTodosStore.getState().reset()
  })

  it('fetchNext 호출 시 items에 결과가 추가된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1', 2000), makeDone('d2', 1000)])

    // when
    await useDoneTodosStore.getState().fetchNext()

    // then
    expect(useDoneTodosStore.getState().items).toHaveLength(2)
  })

  it('fetchNext 연속 호출 시 items가 누적된다', async () => {
    // given: 첫 번째 응답 20개, 두 번째 응답 5개
    const page1 = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, 2000 - i))
    const page2 = [makeDone('d20', 100)]
    vi.mocked(doneTodoApi.getDoneTodos)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)

    // when
    await useDoneTodosStore.getState().fetchNext()
    await useDoneTodosStore.getState().fetchNext()

    // then
    expect(useDoneTodosStore.getState().items).toHaveLength(21)
    expect(useDoneTodosStore.getState().hasMore).toBe(false)
  })

  it('반환 개수가 PAGE_SIZE 미만이면 hasMore가 false가 된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])

    // when
    await useDoneTodosStore.getState().fetchNext()

    // then
    expect(useDoneTodosStore.getState().hasMore).toBe(false)
  })

  it('remove 호출 시 items에서 해당 항목이 제거된다', async () => {
    // given
    useDoneTodosStore.setState({ items: [makeDone('d1'), makeDone('d2')] })
    vi.mocked(doneTodoApi.deleteDoneTodo).mockResolvedValue({ status: 'ok' })

    // when
    await useDoneTodosStore.getState().remove('d1')

    // then
    expect(useDoneTodosStore.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('revert 호출 시 items에서 해당 항목이 제거된다', async () => {
    // given
    useDoneTodosStore.setState({ items: [makeDone('d1'), makeDone('d2')] })
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({
      uuid: 'd1', name: 'done-d1', is_current: true,
    } as any)

    // when
    await useDoneTodosStore.getState().revert('d1')

    // then
    expect(useDoneTodosStore.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('reset 호출 시 상태가 초기화된다', async () => {
    // given
    useDoneTodosStore.setState({ items: [makeDone('d1')], hasMore: false, cursor: 999 })

    // when
    useDoneTodosStore.getState().reset()

    // then
    const state = useDoneTodosStore.getState()
    expect(state.items).toHaveLength(0)
    expect(state.hasMore).toBe(true)
    expect(state.cursor).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/stores/doneTodosStore.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: doneTodosStore 구현**

```ts
// web/src/stores/doneTodosStore.ts
import { create } from 'zustand'
import { doneTodoApi } from '../api/doneTodoApi'
import type { DoneTodo } from '../models'

const PAGE_SIZE = 20

interface DoneTodosState {
  items: DoneTodo[]
  cursor: number | null
  hasMore: boolean
  isLoading: boolean
  fetchNext: () => Promise<void>
  revert: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

export const useDoneTodosStore = create<DoneTodosState>((set, get) => ({
  items: [],
  cursor: null,
  hasMore: true,
  isLoading: false,

  fetchNext: async () => {
    const { isLoading, hasMore, cursor } = get()
    if (isLoading || !hasMore) return
    set({ isLoading: true })
    try {
      const fetched = await doneTodoApi.getDoneTodos(PAGE_SIZE, cursor ?? undefined)
      set(state => {
        const last = fetched[fetched.length - 1]
        return {
          items: [...state.items, ...fetched],
          cursor: last?.done_at ?? state.cursor,
          hasMore: fetched.length === PAGE_SIZE,
          isLoading: false,
        }
      })
    } catch (e) {
      console.warn('Done todos 로드 실패:', e)
      set({ isLoading: false })
    }
  },

  revert: async (id: string) => {
    await doneTodoApi.revertDoneTodo(id)
    set(state => ({ items: state.items.filter(i => i.uuid !== id) }))
  },

  remove: async (id: string) => {
    await doneTodoApi.deleteDoneTodo(id)
    set(state => ({ items: state.items.filter(i => i.uuid !== id) }))
  },

  reset: () => set({ items: [], cursor: null, hasMore: true, isLoading: false }),
}))
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/stores/doneTodosStore.test.ts
```
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add web/src/stores/doneTodosStore.ts web/tests/stores/doneTodosStore.test.ts
git commit -m "[#104] Phase 6-3: doneTodosStore 커서 기반 페이지네이션"
```

---

## Task 4: ConfirmDialog 컴포넌트

**Files:**
- Create: `web/src/components/ConfirmDialog.tsx`
- Create: `web/tests/components/ConfirmDialog.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// web/tests/components/ConfirmDialog.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('메시지와 확인/취소 버튼을 렌더한다', () => {
    // given / when
    render(
      <ConfirmDialog
        message="정말 삭제할까요?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // then
    expect(screen.getByText('정말 삭제할까요?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
  })

  it('확인 버튼 클릭 시 onConfirm이 호출된다', async () => {
    // given
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog message="삭제?" onConfirm={onConfirm} onCancel={vi.fn()} />
    )

    // when
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    expect(onConfirm).toHaveBeenCalled()
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', async () => {
    // given
    const onCancel = vi.fn()
    render(
      <ConfirmDialog message="삭제?" onConfirm={vi.fn()} onCancel={onCancel} />
    )

    // when
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then
    expect(onCancel).toHaveBeenCalled()
  })

  it('danger 플래그가 있으면 확인 버튼에 red 스타일이 적용된다', () => {
    // given / when
    render(
      <ConfirmDialog message="삭제?" onConfirm={vi.fn()} onCancel={vi.fn()} danger />
    )

    // then
    expect(screen.getByRole('button', { name: '확인' })).toHaveClass('bg-red-500')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/components/ConfirmDialog.test.tsx
```
Expected: FAIL (module not found)

- [ ] **Step 3: ConfirmDialog 구현**

```tsx
// web/src/components/ConfirmDialog.tsx
interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({ message, onConfirm, onCancel, danger }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
            onClick={onConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/components/ConfirmDialog.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add web/src/components/ConfirmDialog.tsx web/tests/components/ConfirmDialog.test.tsx
git commit -m "[#104] Phase 6-4: ConfirmDialog 컴포넌트"
```

---

## Task 5: DoneTodosPage

**Files:**
- Create: `web/src/pages/DoneTodosPage.tsx`
- Modify: `web/src/App.tsx` (placeholder → 실제 컴포넌트)
- Create: `web/tests/pages/DoneTodosPage.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// web/tests/pages/DoneTodosPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DoneTodosPage } from '../../src/pages/DoneTodosPage'
import { doneTodoApi } from '../../src/api/doneTodoApi'
import { useDoneTodosStore } from '../../src/stores/doneTodosStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import { todoApi } from '../../src/api/todoApi'

vi.mock('../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(),
    deleteDoneTodo: vi.fn(),
    revertDoneTodo: vi.fn(),
  },
}))

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getCurrentTodos: vi.fn() },
}))

// IntersectionObserver mock (jsdom 미지원)
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: IntersectionObserverCallback) {}
  trigger() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as any)
  }
}

const makeDone = (id: string) => ({
  uuid: id, name: `완료-${id}`, done_at: 1000, origin_event_id: null,
  event_time: null, event_tag_id: null,
})

describe('DoneTodosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDoneTodosStore.getState().reset()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  function renderPage() {
    return render(<MemoryRouter><DoneTodosPage /></MemoryRouter>)
  }

  it('마운트 시 done todos를 불러와 목록을 렌더한다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1'), makeDone('d2')])

    // when
    renderPage()

    // then
    await waitFor(() => {
      expect(screen.getByText('완료-d1')).toBeInTheDocument()
      expect(screen.getByText('완료-d2')).toBeInTheDocument()
    })
  })

  it('모든 항목을 불러오면 "모두 표시됨" 텍스트가 나타난다', async () => {
    // given: PAGE_SIZE(20)보다 적게 반환
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])

    // when
    renderPage()

    // then
    await waitFor(() => {
      expect(screen.getByText('모두 표시됨')).toBeInTheDocument()
    })
  })

  it('삭제 버튼 클릭 → 확인 다이얼로그 → 확인 시 항목이 제거된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])
    vi.mocked(doneTodoApi.deleteDoneTodo).mockResolvedValue({ status: 'ok' })

    renderPage()
    await waitFor(() => screen.getByText('완료-d1'))

    // when: 삭제 버튼 → 다이얼로그 확인
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      expect(screen.queryByText('완료-d1')).not.toBeInTheDocument()
    })
  })

  it('되돌리기 버튼 클릭 시 항목이 목록에서 제거된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({
      uuid: 'd1', name: '완료-d1', is_current: true,
    } as any)
    vi.mocked(todoApi.getCurrentTodos).mockResolvedValue([])

    renderPage()
    await waitFor(() => screen.getByText('완료-d1'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))

    // then
    await waitFor(() => {
      expect(screen.queryByText('완료-d1')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/pages/DoneTodosPage.test.tsx
```
Expected: FAIL (module not found)

- [ ] **Step 3: DoneTodosPage 구현**

```tsx
// web/src/pages/DoneTodosPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useDoneTodosStore } from '../stores/doneTodosStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function DoneTodosPage() {
  const { items, hasMore, fetchNext, revert, remove, reset } = useDoneTodosStore()
  const fetchCurrentTodos = useCurrentTodosStore(s => s.fetch)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    reset()
    fetchNext()
    return () => { reset() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNext()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNext])

  const handleRevert = async (id: string) => {
    await revert(id)
    await fetchCurrentTodos()
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-gray-900">완료된 할 일</h1>

      {items.length === 0 && hasMore === false && (
        <p className="py-8 text-center text-sm text-gray-400">완료된 할 일이 없습니다</p>
      )}

      <ul className="divide-y divide-gray-100">
        {items.map(item => {
          const color = item.event_tag_id
            ? (getColorForTagId(item.event_tag_id) ?? '#9ca3af')
            : '#9ca3af'
          const doneDate = item.done_at
            ? new Date(item.done_at * 1000).toLocaleDateString('ko-KR')
            : null

          return (
            <li key={item.uuid} className="flex items-center gap-3 py-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">{item.name}</p>
                {doneDate && <p className="text-xs text-gray-400">{doneDate}</p>}
              </div>
              <button
                className="rounded-md px-2 py-1 text-xs text-blue-500 hover:bg-blue-50"
                onClick={() => handleRevert(item.uuid)}
              >
                되돌리기
              </button>
              <button
                className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                onClick={() => setConfirmId(item.uuid)}
              >
                삭제
              </button>
            </li>
          )
        })}
      </ul>

      <div ref={sentinelRef} className="py-2 text-center text-xs text-gray-400">
        {!hasMore && items.length > 0 && '모두 표시됨'}
      </div>

      {confirmId && (
        <ConfirmDialog
          message="완료 항목을 삭제할까요? 되돌릴 수 없습니다."
          danger
          onConfirm={async () => {
            await remove(confirmId)
            setConfirmId(null)
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: App.tsx — placeholder를 DoneTodosPage로 교체**

```tsx
// web/src/App.tsx 상단 import에 추가
import { DoneTodosPage } from './pages/DoneTodosPage'

// Route 교체
<Route path="/done" element={<DoneTodosPage />} />
// /settings는 다음 Task까지 placeholder 유지
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/pages/DoneTodosPage.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 6: 전체 테스트 이상 없음 확인**

```bash
cd web && npm test -- --run
```
Expected: 전체 PASS

- [ ] **Step 7: 커밋**

```bash
git add web/src/pages/DoneTodosPage.tsx web/src/App.tsx web/tests/pages/DoneTodosPage.test.tsx
git commit -m "[#104] Phase 6-5: DoneTodosPage 무한 스크롤 + 되돌리기/삭제"
```

---

## Task 6: EventDetailPage — 인라인 편집 + Foremost 토글

**Files:**
- Modify: `web/src/pages/EventDetailPage.tsx`
- Create: `web/tests/pages/EventDetailPageEdit.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// web/tests/pages/EventDetailPageEdit.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EventDetailPage } from '../../src/pages/EventDetailPage'
import { todoApi } from '../../src/api/todoApi'
import { eventDetailApi } from '../../src/api/eventDetailApi'
import { useForemostEventStore } from '../../src/stores/foremostEventStore'
import { foremostApi } from '../../src/api/foremostApi'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodo: vi.fn() },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedule: vi.fn() },
}))
vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: {
    getEventDetail: vi.fn(),
    updateEventDetail: vi.fn(),
    deleteEventDetail: vi.fn(),
  },
}))
vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: {
    getForemostEvent: vi.fn(),
    setForemostEvent: vi.fn(),
    removeForemostEvent: vi.fn(),
  },
}))

const mockTodo = { uuid: 'ev1', name: '할 일', is_current: false, event_time: null }

function renderPage(eventId = 'ev1') {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EventDetailPage — 인라인 편집', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useForemostEventStore.setState({ foremostEvent: null })
    vi.mocked(todoApi.getTodo).mockResolvedValue(mockTodo as any)
  })

  it('detail이 있을 때 편집 버튼이 표시된다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: '서울', url: '', memo: '',
    })

    // when
    renderPage()

    // then
    await waitFor(() => expect(screen.getByRole('button', { name: '편집' })).toBeInTheDocument())
  })

  it('편집 버튼 클릭 시 저장/취소 버튼과 입력 필드가 나타난다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '편집' }))

    // then
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('서울')).toBeInTheDocument()
  })

  it('저장 클릭 시 API를 호출하고 읽기 모드로 돌아간다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({ place: '부산', url: '', memo: '' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))
    await userEvent.click(screen.getByRole('button', { name: '편집' }))

    const input = screen.getByDisplayValue('서울')
    await userEvent.clear(input)
    await userEvent.type(input, '부산')

    // when
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()
      expect(screen.getByText('부산')).toBeInTheDocument()
    })
  })

  it('취소 클릭 시 입력값이 원복되고 읽기 모드로 돌아간다', async () => {
    // given
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '서울', url: '', memo: '' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '편집' }))
    await userEvent.click(screen.getByRole('button', { name: '편집' }))
    await userEvent.type(screen.getByDisplayValue('서울'), 'xxx')

    // when
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()
      expect(screen.getByText('서울')).toBeInTheDocument()
    })
  })
})

describe('EventDetailPage — Foremost 토글', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useForemostEventStore.setState({ foremostEvent: null })
    vi.mocked(todoApi.getTodo).mockResolvedValue(mockTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockRejectedValue(new Error('no detail'))
  })

  it('현재 foremost가 아닐 때 "고정 설정" 버튼이 표시된다', async () => {
    // given: foremostEvent null
    renderPage()

    // then
    await waitFor(() => expect(screen.getByRole('button', { name: '고정 설정' })).toBeInTheDocument())
  })

  it('현재 이벤트가 foremost일 때 "고정 해제" 버튼이 표시된다', async () => {
    // given
    useForemostEventStore.setState({
      foremostEvent: { event_id: 'ev1', is_todo: true, event: mockTodo as any },
    })
    renderPage()

    // then
    await waitFor(() => expect(screen.getByRole('button', { name: '고정 해제' })).toBeInTheDocument())
  })

  it('고정 설정 클릭 시 foremostEventStore가 갱신된다', async () => {
    // given
    const newForemost = { event_id: 'ev1', is_todo: true, event: mockTodo as any }
    vi.mocked(foremostApi.setForemostEvent).mockResolvedValue(newForemost as any)
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '고정 설정' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '고정 설정' }))

    // then
    await waitFor(() =>
      expect(useForemostEventStore.getState().foremostEvent?.event_id).toBe('ev1')
    )
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/pages/EventDetailPageEdit.test.tsx
```
Expected: 여러 FAIL (편집 버튼 없음, Foremost 버튼 없음)

- [ ] **Step 3: EventDetailPage에 편집 모드 + Foremost 토글 추가**

```tsx
// web/src/pages/EventDetailPage.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useEventTagStore } from '../stores/eventTagStore'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { EventTimeDisplay } from '../components/EventTimeDisplay'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { EventDetail } from '../models/EventDetail'
import type { Repeating } from '../models/Repeating'

type EventItem = Todo | Schedule

function repeatingLabel(repeating: Repeating): string {
  const { option } = repeating
  switch (option.optionType) {
    case 'every_day': return `매 ${option.interval}일`
    case 'every_week': return `매 ${option.interval}주`
    case 'every_month': return `매 ${option.interval}개월`
    case 'every_year': return `매 ${option.interval}년`
    case 'every_year_some_day': return `매년`
    case 'lunar_calendar_every_year': return `매년 (음력)`
  }
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const setForemost = useForemostEventStore(s => s.setForemost)
  const removeForemost = useForemostEventStore(s => s.removeForemost)

  const [event, setEvent] = useState<EventItem | null>(null)
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EventDetail>({ place: '', url: '', memo: '' })

  useEffect(() => {
    if (!id) return

    async function load(eventId: string) {
      setLoading(true)
      try {
        const eventType = (location.state as { eventType?: string } | null)?.eventType
        let item: EventItem
        if (eventType === 'schedule') {
          item = await scheduleApi.getSchedule(eventId)
        } else if (eventType === 'todo') {
          item = await todoApi.getTodo(eventId)
        } else {
          try {
            item = await todoApi.getTodo(eventId)
          } catch {
            item = await scheduleApi.getSchedule(eventId)
          }
        }
        setEvent(item)

        try {
          const d = await eventDetailApi.getEventDetail(eventId)
          setDetail(d)
        } catch {
          // detail is optional
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load(id)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditStart = () => {
    setEditForm({
      place: detail?.place ?? '',
      url: detail?.url ?? '',
      memo: detail?.memo ?? '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!id) return
    try {
      const updated = await eventDetailApi.updateEventDetail(id, editForm)
      setDetail(updated)
      setIsEditing(false)
    } catch (e) {
      console.warn('이벤트 상세 저장 실패:', e)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const isForemost = foremostEvent?.event_id === id

  const handleForemostToggle = async () => {
    if (!id || !event) return
    if (isForemost) {
      await removeForemost()
    } else {
      const isTodo = 'is_current' in event
      await setForemost(id, isTodo)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-gray-500">이벤트를 찾을 수 없습니다</p>
        <button className="text-blue-500 text-sm" onClick={() => navigate(-1)}>돌아가기</button>
      </div>
    )
  }

  const tagColor = event.event_tag_id ? (getColorForTagId(event.event_tag_id) ?? '#9ca3af') : null
  const eventTime = 'event_time' in event ? event.event_time : undefined
  const repeating = event.repeating

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <button
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        onClick={() => navigate(-1)}
      >
        ← 뒤로
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start gap-3">
          {tagColor && (
            <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: tagColor }} />
          )}
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
        </div>

        {/* Time */}
        {eventTime && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">시간</p>
            <p className="mt-1 text-sm text-gray-700">
              <EventTimeDisplay eventTime={eventTime} />
            </p>
          </div>
        )}

        {/* Repeating */}
        {repeating && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">반복</p>
            <p className="mt-1 text-sm text-gray-700">{repeatingLabel(repeating)}</p>
          </div>
        )}

        {/* EventDetail */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">장소</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={editForm.place ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, place: e.target.value }))}
                  placeholder="장소 입력"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">URL</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={editForm.url ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="URL 입력"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">메모</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  rows={3}
                  value={editForm.memo ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, memo: e.target.value }))}
                  placeholder="메모 입력"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                  onClick={handleCancel}
                >
                  취소
                </button>
                <button
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                  onClick={handleSave}
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <>
              {detail && (detail.place || detail.url || detail.memo) ? (
                <div className="space-y-3">
                  {detail.place && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">장소</p>
                      <p className="mt-1 text-sm text-gray-700">{detail.place}</p>
                    </div>
                  )}
                  {detail.url && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">URL</p>
                      <a
                        href={detail.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm text-blue-500 underline break-all"
                      >
                        {detail.url}
                      </a>
                    </div>
                  )}
                  {detail.memo && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">메모</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{detail.memo}</p>
                    </div>
                  )}
                </div>
              ) : null}
              <button
                className="mt-3 text-xs text-blue-500 hover:underline"
                onClick={handleEditStart}
              >
                편집
              </button>
            </>
          )}
        </div>

        {/* Foremost toggle */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <button
            className={`text-xs font-medium ${isForemost ? 'text-orange-500 hover:text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            onClick={handleForemostToggle}
          >
            {isForemost ? '고정 해제' : '고정 설정'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/pages/EventDetailPageEdit.test.tsx
```
Expected: PASS (7 tests)

- [ ] **Step 5: 전체 테스트 이상 없음 확인**

```bash
cd web && npm test -- --run
```
Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add web/src/pages/EventDetailPage.tsx web/tests/pages/EventDetailPageEdit.test.tsx
git commit -m "[#104] Phase 6-6: EventDetailPage 인라인 편집 + Foremost 토글"
```

---

## Task 7: accountApi + ColorPalette + SettingsPage

**Files:**
- Create: `web/src/api/accountApi.ts`
- Create: `web/src/components/ColorPalette.tsx`
- Create: `web/src/pages/SettingsPage.tsx`
- Modify: `web/src/App.tsx` (placeholder → SettingsPage)
- Create: `web/tests/components/ColorPalette.test.tsx`
- Create: `web/tests/pages/SettingsPage.test.tsx`

- [ ] **Step 1: accountApi 생성 (테스트 불필요 — apiClient 래퍼 레벨)**

```ts
// web/src/api/accountApi.ts
import { apiClient } from './apiClient'

export const accountApi = {
  deleteAccount(): Promise<{ status: string }> {
    return apiClient.delete('/v1/accounts/account')
  },
}
```

- [ ] **Step 2: ColorPalette 테스트 작성**

```tsx
// web/tests/components/ColorPalette.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPalette } from '../../src/components/ColorPalette'

const COLORS = ['#ef4444', '#3b82f6', '#22c55e']

describe('ColorPalette', () => {
  it('전달된 색상 버튼을 렌더한다', () => {
    // given / when
    render(<ColorPalette colors={COLORS} selected="#ef4444" onChange={vi.fn()} />)

    // then: 각 색상마다 버튼이 존재
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('색상 버튼 클릭 시 onChange에 해당 hex가 전달된다', async () => {
    // given
    const onChange = vi.fn()
    render(<ColorPalette colors={COLORS} selected="#ef4444" onChange={onChange} />)

    // when: 두 번째 버튼(#3b82f6) 클릭
    await userEvent.click(screen.getAllByRole('button')[1])

    // then
    expect(onChange).toHaveBeenCalledWith('#3b82f6')
  })

  it('selected 색상 버튼에 강조 테두리 클래스가 적용된다', () => {
    // given / when
    render(<ColorPalette colors={COLORS} selected="#3b82f6" onChange={vi.fn()} />)

    // then
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toHaveClass('border-gray-800')
    expect(buttons[0]).not.toHaveClass('border-gray-800')
  })
})
```

- [ ] **Step 3: ColorPalette 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/components/ColorPalette.test.tsx
```
Expected: FAIL (module not found)

- [ ] **Step 4: ColorPalette 구현**

```tsx
// web/src/components/ColorPalette.tsx
export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

interface ColorPaletteProps {
  colors?: string[]
  selected: string
  onChange: (hex: string) => void
}

export function ColorPalette({ colors = PRESET_COLORS, selected, onChange }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <button
          key={color}
          title={color}
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full border-2 transition-transform ${
            selected === color ? 'border-gray-800 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: ColorPalette 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/components/ColorPalette.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 6: SettingsPage 테스트 작성**

```tsx
// web/tests/pages/SettingsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '../../src/pages/SettingsPage'
import { settingApi } from '../../src/api/settingApi'
import { accountApi } from '../../src/api/accountApi'
import { useAuthStore } from '../../src/stores/authStore'

vi.mock('../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn(),
    updateDefaultTagColors: vi.fn(),
  },
}))

vi.mock('../../src/api/accountApi', () => ({
  accountApi: { deleteAccount: vi.fn() },
}))

// authStore는 스토어 모킹 (계정 정보 제어를 위해)
vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockColors = { holiday: '#ef4444', default: '#3b82f6' }

describe('SettingsPage', () => {
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      account: { uid: 'u1', email: 'test@example.com' },
      signOut: mockSignOut,
    } as any)
    vi.mocked(settingApi.getDefaultTagColors).mockResolvedValue(mockColors)
  })

  function renderPage() {
    return render(<MemoryRouter><SettingsPage /></MemoryRouter>)
  }

  it('계정 이메일이 표시된다', async () => {
    // given / when
    renderPage()

    // then
    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument())
  })

  it('로그아웃 버튼 클릭 시 signOut이 호출된다', async () => {
    // given
    renderPage()
    await waitFor(() => screen.getByText('test@example.com'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    // then
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('마운트 시 기본 태그 색상을 로드한다', async () => {
    // given / when
    renderPage()

    // then: 두 슬롯(holiday, default)의 컬러 팔레트가 렌더됨
    await waitFor(() => {
      expect(screen.getByText('공휴일 색상')).toBeInTheDocument()
      expect(screen.getByText('기본 색상')).toBeInTheDocument()
    })
  })

  it('저장 버튼 클릭 시 updateDefaultTagColors가 호출된다', async () => {
    // given
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue(mockColors)
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '색상 저장' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '색상 저장' }))

    // then
    await waitFor(() => expect(settingApi.updateDefaultTagColors).toHaveBeenCalled())
  })

  it('계정 삭제 버튼 클릭 → 확인 다이얼로그 → 확인 시 deleteAccount와 signOut이 호출된다', async () => {
    // given
    vi.mocked(accountApi.deleteAccount).mockResolvedValue({ status: 'ok' })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: '계정 삭제' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '계정 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      expect(accountApi.deleteAccount).toHaveBeenCalled()
      expect(mockSignOut).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 7: SettingsPage 테스트 실패 확인**

```bash
cd web && npm test -- --run tests/pages/SettingsPage.test.tsx
```
Expected: FAIL (module not found)

- [ ] **Step 8: SettingsPage 구현**

```tsx
// web/src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { settingApi } from '../api/settingApi'
import { accountApi } from '../api/accountApi'
import { ColorPalette } from '../components/ColorPalette'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { DefaultTagColors } from '../models'

export function SettingsPage() {
  const account = useAuthStore(s => s.account)
  const signOut = useAuthStore(s => s.signOut)
  const [colors, setColors] = useState<DefaultTagColors | null>(null)
  const [editColors, setEditColors] = useState<DefaultTagColors | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    settingApi.getDefaultTagColors()
      .then(c => { setColors(c); setEditColors(c) })
      .catch(e => console.warn('색상 로드 실패:', e))
  }, [])

  const handleSaveColors = async () => {
    if (!editColors) return
    try {
      const updated = await settingApi.updateDefaultTagColors(editColors)
      setColors(updated)
      setEditColors(updated)
    } catch (e) {
      console.warn('색상 저장 실패:', e)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await accountApi.deleteAccount()
      await signOut()
    } catch (e) {
      console.warn('계정 삭제 실패:', e)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
      <h1 className="text-lg font-bold text-gray-900">설정</h1>

      {/* 기본 태그 색상 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">기본 태그 색상</h2>
        {editColors && (
          <>
            <div>
              <p className="mb-2 text-xs text-gray-500">공휴일 색상</p>
              <ColorPalette
                selected={editColors.holiday}
                onChange={hex => setEditColors(c => c ? { ...c, holiday: hex } : c)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-gray-500">기본 색상</p>
              <ColorPalette
                selected={editColors.default}
                onChange={hex => setEditColors(c => c ? { ...c, default: hex } : c)}
              />
            </div>
            <button
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              onClick={handleSaveColors}
            >
              색상 저장
            </button>
          </>
        )}
      </section>

      {/* 계정 정보 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">계정</h2>
        {account && (
          <p className="text-sm text-gray-500">{account.email ?? account.uid}</p>
        )}
        <button
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          onClick={signOut}
        >
          로그아웃
        </button>
      </section>

      {/* 계정 삭제 */}
      <section className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-red-500">위험 구역</h2>
        <button
          className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
          onClick={() => setShowDeleteConfirm(true)}
        >
          계정 삭제
        </button>
      </section>

      {showDeleteConfirm && (
        <ConfirmDialog
          message="계정을 삭제하면 모든 데이터가 사라집니다. 계속할까요?"
          danger
          onConfirm={async () => {
            setShowDeleteConfirm(false)
            await handleDeleteAccount()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 9: App.tsx — SettingsPage placeholder 교체**

```tsx
// web/src/App.tsx 상단 import에 추가
import { SettingsPage } from './pages/SettingsPage'

// Route 교체
<Route path="/settings" element={<SettingsPage />} />
```

- [ ] **Step 10: 테스트 통과 확인**

```bash
cd web && npm test -- --run tests/pages/SettingsPage.test.tsx
```
Expected: PASS (5 tests)

- [ ] **Step 11: 전체 테스트 이상 없음 확인**

```bash
cd web && npm test -- --run
```
Expected: 전체 PASS

- [ ] **Step 12: 커밋**

```bash
git add web/src/api/accountApi.ts web/src/components/ColorPalette.tsx web/src/pages/SettingsPage.tsx web/src/App.tsx web/tests/components/ColorPalette.test.tsx web/tests/pages/SettingsPage.test.tsx
git commit -m "[#104] Phase 6-7: accountApi + ColorPalette + SettingsPage"
```

---

## 검증 체크리스트

- [ ] Header 탭 클릭 → 올바른 페이지, active 탭 하이라이트
- [ ] `/done` 진입 → Done Todos 목록 표시, 스크롤 → 추가 로드
- [ ] 되돌리기 → CurrentTodoList 갱신
- [ ] EventDetailPage 편집 → 저장 → 새로고침 후 유지
- [ ] Foremost 설정 → MainPage 배너 갱신
- [ ] `/settings` 기본 색상 저장 → 재진입 시 유지
- [ ] 로그아웃 → 로그인 페이지로 이동
- [ ] `npm test -- --run` 전체 통과

---

## docs/web/TODO.md 업데이트 포인트

Phase 6 항목을 완료 처리하고 TODO.md의 Phase 6 체크박스를 모두 `[x]`로 변경한다 (마지막 커밋 후 수행).
