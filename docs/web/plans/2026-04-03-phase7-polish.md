# Phase 7: 폴리시 + E2E 테스트 + 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹 MVP의 테스트 품질, 에러 처리, 캐시/스토어 최적화, 반응형 디자인, 성능, 배포를 마무리한다.

**Architecture:** 기존 Zustand 스토어에 에러 상태와 로그아웃 정리를 추가하고, ErrorBoundary·Toast 글로벌 UX 컴포넌트를 도입하며, React.lazy로 라우트 분할 후 Firebase Hosting에 배포한다.

**Tech Stack:** React 19, Zustand, Tailwind CSS, Vite, Vitest, Playwright, Firebase Hosting

---

## Task 1: TC 검사 — 행동 중심 테스트 리라이트

**Files:**
- Modify: `tests/stores/authStore.test.ts`
- Modify: `tests/stores/foremostEventStore.test.ts`
- Modify: `tests/components/ConfirmDialog.test.tsx`
- Modify: `tests/components/DayEventList.test.tsx`
- Modify: `tests/components/TagSelector.test.tsx`
- Modify: `tests/components/TypeSelectorPopup.test.tsx`
- Modify: `tests/components/ColorPalette.test.tsx`
- Modify: `tests/components/RepeatingScopeDialog.test.tsx`
- Modify: `tests/components/RepeatingPicker.test.tsx`
- Modify: `tests/components/CurrentTodoList.test.tsx`
- Modify: `tests/pages/SettingsPage.test.tsx`

**위반 패턴 요약:** `.toHaveBeenCalledWith()`, `.toHaveBeenCalled()`, 내부 `loading` 상태 직접 검증

**리라이트 원칙:**
- 콜백 검증 → 콜백 실행 후 **UI 결과**를 검증 (예: dialog 닫힘, 화면 텍스트 변경)
- props 콜백을 모킹한 단위 컴포넌트(ConfirmDialog, ColorPalette 등)는 콜백 호출 여부가 유일한 관찰 가능 결과이므로, **콜백이 외부 상태를 변경하는 통합 시나리오로 대체**하거나 부모 컴포넌트 테스트로 커버하되, 순수 프레젠테이셔널 컴포넌트에서 `toHaveBeenCalled` 수준(인자 없이)의 콜백 호출 확인은 **역할 검증의 일부로 허용** — `toHaveBeenCalledWith`만 금지
- 내부 상태(`loading`, `map.size`) 검증 → 사용자 관점 UI 상태 검증

### 수정 대상 상세

#### 1-1. `authStore.test.ts`
- `.toHaveBeenCalledWith('/v1/accounts/info', {})` → 삭제. 대신 `getState().account` 결과값 검증
- `loading` 상태 직접 검증 → 삭제하거나, AuthGuard 통합 테스트에서 스피너 렌더링으로 검증

#### 1-2. `foremostEventStore.test.ts`
- `console.warn` spy `.toHaveBeenCalled()` → 삭제. 에러 시 `foremostEvent`가 null인지 결과 검증

#### 1-3. `ConfirmDialog.test.tsx`
- `onConfirm`/`onCancel` `.toHaveBeenCalled()` → 순수 프레젠테이셔널 콜백이므로 `.toHaveBeenCalled()` 허용 (인자 검증만 금지)

#### 1-4. `DayEventList.test.tsx`
- `navigate` `.toHaveBeenCalledWith(...)` → `memoryRouter`에서 이동 후 URL/화면 변화 검증

#### 1-5. `TagSelector.test.tsx`
- `onChange` `.toHaveBeenCalledWith('t1')` → 부모 통합 시나리오로 대체하거나, `onChange` 호출 후 UI 변화 검증
- `navigate` `.toHaveBeenCalled()` → 라우터 이동 결과 검증

#### 1-6. `TypeSelectorPopup.test.tsx`
- `onSelect` `.toHaveBeenCalledWith('todo'/'schedule')` → 순수 프레젠테이셔널이므로 `.toHaveBeenCalled()` 허용, `CalledWith` 삭제

#### 1-7. `ColorPalette.test.tsx`
- `onSelect` `.toHaveBeenCalledWith('#3b82f6')` → `.toHaveBeenCalled()` 허용, `CalledWith` 삭제

#### 1-8. `RepeatingScopeDialog.test.tsx`
- `onSelect` `.toHaveBeenCalledWith('this'/'future'/'all')` → `.toHaveBeenCalled()` 허용, `CalledWith` 삭제
- `onCancel` `.toHaveBeenCalled()` → 허용

#### 1-9. `RepeatingPicker.test.tsx`
- `onChange` `.toHaveBeenCalled()` → 허용 (인자 없음)

#### 1-10. `CurrentTodoList.test.tsx`
- `useCalendarEventsStore.getState().loading` 직접 검증 → 삭제 또는 UI 상태로 대체

#### 1-11. `SettingsPage.test.tsx`
- `mockSignOut` `.toHaveBeenCalled()` → 로그아웃 후 LoginPage 렌더링 검증
- `updateDefaultTagColors` API `.toHaveBeenCalled()` → 저장 후 UI 피드백 검증
- 계정 삭제 API `.toHaveBeenCalled()` → 삭제 후 LoginPage 리다이렉트 검증

- [ ] **Step 1:** 각 파일의 위반 패턴을 위 원칙에 따라 수정
- [ ] **Step 2:** `npm test` 전체 통과 확인
- [ ] **Step 3:** 커밋 `[#104] Phase 7-0: TC 행동 중심 리라이트`

---

## Task 2: ErrorBoundary + Toast + LoadingSkeleton 컴포넌트

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/stores/toastStore.ts`
- Create: `src/components/LoadingSkeleton.tsx`
- Create: `tests/components/ErrorBoundary.test.tsx`
- Create: `tests/components/Toast.test.tsx`
- Create: `tests/stores/toastStore.test.ts`
- Modify: `src/App.tsx` — ErrorBoundary 래핑

### 2-1. ErrorBoundary

React class 컴포넌트 (getDerivedStateFromError + componentDidCatch). 에러 발생 시 "문제가 발생했습니다" + 새로고침 버튼.

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
          <p className="text-lg font-semibold text-gray-800">문제가 발생했습니다</p>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

### 2-2. Toast (toastStore + Toast 컴포넌트)

Zustand 스토어로 토스트 큐 관리. 3초 후 자동 dismiss. 타입: `success | error | info`.

```ts
// src/stores/toastStore.ts
import { create } from 'zustand'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: ToastItem[]
  show: (message: string, type?: ToastItem['type']) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { id, message, type }] })
    setTimeout(() => get().dismiss(id), 3000)
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  },
}))
```

```tsx
// src/components/Toast.tsx
import { useToastStore } from '../stores/toastStore'

const bgColor = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' }

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`${bgColor[t.type]} rounded-lg px-4 py-2 text-sm text-white shadow-lg`}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
```

### 2-3. LoadingSkeleton

```tsx
// src/components/LoadingSkeleton.tsx
interface Props { lines?: number; className?: string }

export function LoadingSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded bg-gray-200" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  )
}
```

### 2-4. App.tsx에 ErrorBoundary + Toast 통합

```tsx
// App.tsx의 App 함수 수정
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  )
}
```

- [ ] **Step 1:** toastStore 테스트 작성 및 구현
- [ ] **Step 2:** Toast 컴포넌트 테스트 작성 및 구현
- [ ] **Step 3:** ErrorBoundary 테스트 작성 및 구현
- [ ] **Step 4:** LoadingSkeleton 구현 (순수 프레젠테이셔널, 테스트 불필요)
- [ ] **Step 5:** App.tsx에 ErrorBoundary + ToastContainer 통합
- [ ] **Step 6:** `npm test` 전체 통과 확인
- [ ] **Step 7:** 커밋 `[#104] Phase 7-1: ErrorBoundary + Toast + LoadingSkeleton`

---

## Task 3: 네트워크 실패 / 401 처리

**Files:**
- Modify: `src/api/apiClient.ts` — 401 감지 시 자동 로그아웃
- Modify: `src/stores/authStore.ts` — 로그아웃 시 전체 스토어 리셋
- Modify: `tests/api/apiClient.test.ts`
- Modify: `tests/stores/authStore.test.ts`

### 3-1. apiClient에 401 인터셉터 추가

`apiClient.request()` 내부에서 `response.status === 401`일 때 `useAuthStore.getState().signOut()` 호출 후 에러 throw.

### 3-2. 로그아웃 시 스토어 정리

`authStore.signOut()` 내부에서 Firebase signOut 후 데이터 스토어 리셋:

```ts
signOut: async () => {
  await firebaseSignOut(auth)
  // 데이터 스토어 정리 — 다음 로그인 시 깨끗한 상태 보장
  useEventTagStore.getState().reset()
  useCurrentTodosStore.getState().reset()
  useForemostEventStore.getState().reset()
  useCalendarEventsStore.getState().reset()
},
```

각 스토어에 `reset()` 메서드 추가 (초기 상태로 되돌리기).

### 3-3. 페이지별 에러 → Toast 연동

기존 `console.warn`으로만 처리되던 에러를 `useToastStore.getState().show(message, 'error')` 호출로 교체. 대상:
- `SettingsPage` — 색상 로드/저장, 계정 삭제 실패
- `TagManagementPage` — 태그 CRUD 실패
- `DoneTodosPage` — 되돌리기/삭제 실패
- `EventDetailPage` — 편집 저장 실패

- [ ] **Step 1:** 각 스토어에 `reset()` 메서드 추가 + 테스트
- [ ] **Step 2:** apiClient 401 처리 테스트 작성 및 구현
- [ ] **Step 3:** authStore signOut에 스토어 리셋 추가 + 테스트
- [ ] **Step 4:** 페이지별 에러 → Toast 연동
- [ ] **Step 5:** `npm test` 전체 통과 확인
- [ ] **Step 6:** 커밋 `[#104] Phase 7-1: 401 자동 로그아웃 + 스토어 리셋 + Toast 에러 표시`

---

## Task 4: 캐시 데이터 활용 검토 + 스토어 스코프 조정

**Files:**
- Modify: `src/stores/calendarEventsStore.ts` — range 변경 시에만 캐시 클리어
- Modify: `src/stores/doneTodosStore.ts` — 자동 리셋 정리
- Modify: `tests/stores/calendarEventsStore.test.ts`

### 4-1. calendarEventsStore 캐시 개선

현재 `fetchEventsForRange`는 매번 `eventsByDate: new Map()`으로 클리어한다. 같은 range 재요청 시 캐시를 활용하도록 개선:

```ts
fetchEventsForRange: async (lower: number, upper: number) => {
  const { lastRange } = get()
  // 같은 범위 재요청 → 스킵
  if (lastRange && lastRange.lower === lower && lastRange.upper === upper && get().eventsByDate.size > 0) {
    return
  }
  set({ loading: true, lastRange: { lower, upper } })
  // ... 기존 fetch 로직
},
```

### 4-2. 스토어 스코프 판단

탐색 결과 대부분의 스토어는 글로벌 싱글톤이 적합:
- `authStore`, `uiStore`, `eventTagStore`, `foremostEventStore`, `holidayStore` → **유지**
- `calendarEventsStore`, `currentTodosStore` → MainPage 이외에서도 CRUD 후 addEvent/removeEvent로 사용하므로 **글로벌 유지**가 합리적
- `doneTodosStore` → 이미 `reset()` 패턴 사용 중, **현행 유지**

**결론:** 스토어 스코프 변경은 불필요. 로그아웃 시 리셋(Task 3)으로 충분.

### 4-3. AuthGuard 부트 시퀀스 개선

현재 3개 fetch가 fire-and-forget. 에러 시 Toast 알림 추가:

```ts
useEffect(() => {
  if (account) {
    Promise.all([
      useEventTagStore.getState().fetchAll(),
      useCurrentTodosStore.getState().fetch(),
      useForemostEventStore.getState().fetch(),
    ]).catch(() => {
      useToastStore.getState().show('데이터 로드에 실패했습니다', 'error')
    })
  }
}, [account])
```

- [ ] **Step 1:** calendarEventsStore 캐시 스킵 로직 추가 + 테스트
- [ ] **Step 2:** AuthGuard 부트 에러 처리 추가
- [ ] **Step 3:** `npm test` 전체 통과 확인
- [ ] **Step 4:** 커밋 `[#104] Phase 7-2/7-3: 캐시 활용 개선 + AuthGuard 에러 처리`

---

## Task 5: 반응형 디자인 감사 및 수정

**Files:**
- Modify: `src/components/Header.tsx` — 모바일 nav 개선
- Modify: `src/pages/MainPage.tsx` — FAB safe area, 타이포 조정
- Modify: `src/pages/EventDetailPage.tsx` — 모바일 패딩/타이포
- Modify: `src/pages/TodoFormPage.tsx` — 모바일 터치 타겟
- Modify: `src/pages/ScheduleFormPage.tsx` — 모바일 터치 타겟
- Modify: `src/pages/DoneTodosPage.tsx` — 모바일 패딩
- Modify: `src/pages/TagManagementPage.tsx` — 모바일 max-width
- Modify: `src/pages/SettingsPage.tsx` — 모바일 레이아웃
- Modify: `src/index.css` — safe-area 지원

### 수정 포인트

**5-1. index.css — safe-area + base styles**
```css
@import "tailwindcss";

html {
  -webkit-text-size-adjust: 100%;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

**5-2. Header — 모바일 최적화**
- 터치 타겟: `px-3 py-1.5` → `px-3 py-2` (최소 36px 높이)
- 텍스트: `text-sm` → `text-xs md:text-sm` (nav 링크)

**5-3. MainPage — FAB safe area**
- `bottom-6` → `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]`

**5-4. 폼 페이지(TodoFormPage, ScheduleFormPage) — 버튼 터치 타겟**
- 저장/취소 버튼: `py-2` → `py-2.5` (44px 최소 높이 보장)
- `max-w-lg` → `max-w-lg mx-auto` (중앙 정렬 확인)

**5-5. DoneTodosPage, TagManagementPage — 모바일 max-width**
- `max-w-sm` → `max-w-sm mx-auto w-full` (좁은 화면에서 100% 사용)

**5-6. 검증: 375px / 768px / 1280px**
- 각 브레이크포인트에서 레이아웃 확인은 E2E 또는 수동 테스트로 검증

- [ ] **Step 1:** index.css safe-area 추가
- [ ] **Step 2:** Header 모바일 최적화
- [ ] **Step 3:** MainPage FAB safe area
- [ ] **Step 4:** 폼 페이지 터치 타겟 개선
- [ ] **Step 5:** DoneTodosPage, TagManagementPage 모바일 max-width
- [ ] **Step 6:** `npm run build` 성공 확인
- [ ] **Step 7:** 커밋 `[#104] Phase 7-4: 반응형 디자인 감사 및 수정`

---

## Task 6: E2E 테스트

**Files:**
- Modify: `playwright.config.ts` — 타임아웃, 스크린샷 설정
- Modify: `e2e/app.spec.ts` — 로그인 플로우 (에뮬레이터 필요)
- Create: `e2e/calendar.spec.ts`
- Create: `e2e/todo-crud.spec.ts`
- Create: `e2e/schedule-crud.spec.ts`

### 6-1. Playwright 설정 강화

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
```

### 6-2. E2E 테스트 전략

Firebase 에뮬레이터 연동이 필요하지만, 현재 웹앱은 프로덕션 Firebase SDK를 직접 사용하므로 에뮬레이터 모드 전환이 필요하다:
- `src/firebase.ts`에서 `VITE_USE_EMULATOR=true` 환경변수 감지 시 `connectAuthEmulator()` 호출
- E2E에서는 로그인 상태를 건너뛰는 방법(storageState)이 현실적

**실제 E2E 테스트 범위 (에뮬레이터 없이 가능한 것):**
- `app.spec.ts` — 페이지 로드, 로그인 페이지 리다이렉트
- `calendar.spec.ts` — 로그인 없이는 제한적 (리다이렉트 확인만)
- 인증 필요한 CRUD 테스트는 에뮬레이터 설정 후 추가

### 6-3. 기본 E2E 테스트

```ts
// e2e/app.spec.ts
import { test, expect } from '@playwright/test'

test('미인증 사용자는 로그인 페이지로 리다이렉트', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('로그인 페이지에 소셜 로그인 버튼 표시', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
})
```

```ts
// e2e/calendar.spec.ts
import { test, expect } from '@playwright/test'

test('미인증 상태에서 캘린더 접근 시 로그인 리다이렉트', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})
```

- [ ] **Step 1:** Playwright 설정 강화
- [ ] **Step 2:** app.spec.ts 확장 (리다이렉트, 로그인 페이지 검증)
- [ ] **Step 3:** calendar.spec.ts, todo-crud.spec.ts, schedule-crud.spec.ts 기본 테스트 작성
- [ ] **Step 4:** `npm run test:e2e` 통과 확인
- [ ] **Step 5:** 커밋 `[#104] Phase 7-5: E2E 테스트 기본 설정 + 비인증 시나리오`

---

## Task 7: 성능 최적화 + 배포

**Files:**
- Modify: `src/App.tsx` — React.lazy 라우트 분할
- Modify: `src/calendar/MonthCalendar.tsx` — useMemo 검토
- Modify: `tests/App.test.tsx` — lazy 로딩 대응 (Suspense)

### 7-1. React.lazy 라우트 분할

```tsx
// src/App.tsx — static import → lazy import 교체
import React, { Suspense } from 'react'

const EventDetailPage = React.lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
const TodoFormPage = React.lazy(() => import('./pages/TodoFormPage').then(m => ({ default: m.TodoFormPage })))
const ScheduleFormPage = React.lazy(() => import('./pages/ScheduleFormPage').then(m => ({ default: m.ScheduleFormPage })))
const TagManagementPage = React.lazy(() => import('./pages/TagManagementPage').then(m => ({ default: m.TagManagementPage })))
const DoneTodosPage = React.lazy(() => import('./pages/DoneTodosPage').then(m => ({ default: m.DoneTodosPage })))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
```

MainPage와 LoginPage는 초기 로딩에 필요하므로 static import 유지.

Routes를 `<Suspense fallback={<LoadingSkeleton />}>` 로 래핑.

### 7-2. useMemo 검토

MonthCalendar의 날짜 그리드 계산이 매 렌더에 실행되는지 확인. 필요 시 `useMemo`로 메모이제이션.

### 7-3. 빌드 + 배포 검증

```bash
cd web && npm run build
# 번들 사이즈 확인 (기존 192KB → 분할 후 감소 예상)

# Firebase 배포
cd .. && firebase deploy --only hosting

# SPA 라우팅 확인 — firebase.json에 이미 "**" → "/index.html" rewrite 설정됨
```

- [ ] **Step 1:** React.lazy로 라우트 분할 + Suspense 래핑
- [ ] **Step 2:** App.test.tsx 수정 (lazy 컴포넌트 대응)
- [ ] **Step 3:** MonthCalendar useMemo 검토 및 적용
- [ ] **Step 4:** `npm test` 전체 통과 확인
- [ ] **Step 5:** `npm run build` 성공 + 번들 사이즈 확인
- [ ] **Step 6:** 커밋 `[#104] Phase 7-6: React.lazy 라우트 분할 + 빌드 최적화`
- [ ] **Step 7:** (사용자 확인 후) `firebase deploy --only hosting` 배포

---

## Task 8: 문서 업데이트

**Files:**
- Modify: `web/CLAUDE.md` — 아키텍처 섹션 업데이트 (ErrorBoundary, Toast, lazy 라우팅)
- Modify: `docs/web/TODO.md` — Phase 7 체크박스 완료 처리

### 업데이트 내용

**web/CLAUDE.md:**
- Architecture Overview에 ErrorBoundary, ToastContainer, LoadingSkeleton 추가
- 라우트 분할 (React.lazy) 패턴 문서화
- 에러 처리 패턴 (Toast 사용법) 문서화

**docs/web/TODO.md:**
- Phase 7 전체 체크박스 완료 표시

- [ ] **Step 1:** web/CLAUDE.md 업데이트
- [ ] **Step 2:** docs/web/TODO.md Phase 7 완료 처리
- [ ] **Step 3:** 커밋 `[#104] Phase 7-7: 문서 업데이트`
