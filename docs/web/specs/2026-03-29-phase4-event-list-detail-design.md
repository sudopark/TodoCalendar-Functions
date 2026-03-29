# Phase 4: 일별 이벤트 목록 + 이벤트 상세 — 설계 문서

> 작성일: 2026-03-29

---

## 1. 목표

캘린더에서 날짜를 선택했을 때 해당 날짜의 이벤트 목록을 보여주고, 이벤트를 클릭하면 상세 정보를 오버레이로 표시한다.

---

## 2. 레이아웃

Split Panel 방식. 반응형 기준:

- **모바일** (`< md`): 세로 배치 — 캘린더 위, 이벤트 패널 아래
- **데스크톱** (`≥ md`): 가로 배치 — 캘린더 좌, 이벤트 패널 우 (너비 고정)

```
MainLayout
├── [모바일] flex-col
│   ├── MonthCalendar
│   └── EventPanel
└── [데스크톱] flex-row
    ├── MonthCalendar (flex-1)
    └── EventPanel (w-80, border-left)
```

`EventPanel` 내부 구성:

```
EventPanel
├── ForemostEventBanner  (foremostEvent 있을 때만)
├── CurrentTodoList      (항상 표시)
└── DayEventList         (selectedDate 있을 때만)
```

---

## 3. 라우팅

```
/            → MainLayout (캘린더 + 이벤트 패널)
/event/:id   → MainLayout(background) + EventDetailModal(overlay)
/login       → LoginPage
```

**EventDetail 오버레이 패턴 (React Router background location):**

- 이벤트 클릭 시 `navigate('/event/:id', { state: { background: location } })`
- `App.tsx`에서 `location.state?.background` 유무로 분기:
  - background 있음 → `<Routes location={background}>` 로 캘린더 렌더 + `/event/:id` overlay 렌더
  - background 없음 (직접 URL 접근) → 상세 단독 렌더 (fullscreen fallback)
- `EventDetailModal`은 pageSheet 스타일 — backdrop dim + 카드 중앙/하단

---

## 4. 신설 스토어

### 4-1. `currentTodosStore`

| 항목 | 내용 |
|------|------|
| 소스 | `GET /v1/todos` (파라미터 없음) |
| 로드 시점 | AuthGuard — 로그인 성공 시 (eventTagStore.fetchAll과 동일) |
| 공개 상태 | `todos: Todo[]` |
| 공개 액션 | `fetchCurrentTodos(): Promise<void>` |

### 4-2. `foremostStore`

| 항목 | 내용 |
|------|------|
| 소스 | `GET /v1/foremost/event` |
| 로드 시점 | AuthGuard — 로그인 성공 시 |
| 공개 상태 | `foremostEvent: ForemostEvent \| null` |
| 공개 액션 | `fetchForemostEvent(): Promise<void>` |

---

## 5. 신설 컴포넌트

### 5-1. `EventTimeDisplay`

순수 표시 컴포넌트. `EventTime`을 받아 포맷 문자열로 렌더.

| EventTime 타입 | 표시 예시 |
|---------------|----------|
| `at` | `14:00` |
| `period` | `14:00 – 15:30` |
| `allday` | `종일` / 기간이면 `3/29 – 3/31 종일` |

### 5-2. `ForemostEventBanner`

- `foremostStore.foremostEvent` 구독
- `null`이면 렌더 안 함
- 클릭 시 `/event/:id` 이동

### 5-3. `CurrentTodoList`

- `currentTodosStore.todos` 구독
- 목록이 비어 있어도 섹션 헤더는 표시
- 각 항목 클릭 시 `/event/:id` 이동

### 5-4. `DayEventList`

- `uiStore.selectedDate` + `calendarEventsStore.eventsByDate` 구독
- `selectedDate`가 없으면 렌더 안 함
- Todo → Schedule 순 정렬
- 각 항목에 태그 컬러 dot, `EventTimeDisplay` 사용
- 각 항목 클릭 시 `/event/:id` 이동

### 5-5. `EventDetailModal`

- `/event/:id` 라우트에서 렌더
- `GET /v1/event_details/:id` 호출 (로컬 상태로 관리, 별도 스토어 없음)
- 표시 항목: 이름, EventTime, 태그 컬러, 장소, URL(클릭 가능), 메모
- backdrop 클릭 또는 닫기 버튼 → `navigate(-1)`
- background 없는 직접 접근 → fullscreen 카드

---

## 6. 기존 파일 변경

| 파일 | 변경 내용 |
|------|----------|
| `App.tsx` | background location 라우팅 로직 추가, `MainLayout` 도입 |
| `components/AuthGuard.tsx` | `currentTodosStore.fetchCurrentTodos`, `foremostStore.fetchForemostEvent` 추가 호출 |

---

## 7. 테스트 범위

| 대상 | 검증 내용 |
|------|----------|
| `currentTodosStore` | fetch 후 `todos` 반환값 |
| `foremostStore` | fetch 후 `foremostEvent` 반환값 |
| `DayEventList` | selectedDate 있을 때 이벤트 렌더, 없을 때 null |
| `CurrentTodoList` | todos 목록 렌더 |
| `ForemostEventBanner` | foremostEvent 있을 때만 렌더 |
| `EventDetailModal` | 이벤트 정보 표시, 닫기 동작 |
| `EventTimeDisplay` | at/period/allday 각 포맷 |
