# Phase 5: Todo/Schedule CRUD — 설계 문서

> 작성일: 2026-04-01

---

## 1. 목표

이벤트 조회만 가능했던 앱에 Todo/Schedule 생성·수정·삭제·완료 기능을 추가한다.
태그 CRUD, 반복 이벤트 전체 지원(6가지 옵션), 반복 범위 선택(이 항목만/이후 전체/모든 이벤트)을 포함한다.

---

## 2. 라우팅 추가

```
/todos/new           → TodoFormPage 모달 (background: 현재 위치 유지)
/todos/:id/edit      → TodoFormPage 모달
/schedules/new       → ScheduleFormPage 모달
/schedules/:id/edit  → ScheduleFormPage 모달
/tags                → TagManagementPage 모달 (background: TodoForm or ScheduleForm)
```

모든 폼 라우트는 Phase 4에서 확립한 **React Router background location 오버레이 패턴**을 동일하게 적용한다.

### FAB 진입 흐름

```
MainPage
  └── FAB "+" (우하단 고정, position: fixed)
        └── TypeSelectorPopup
              ├── "Todo" → navigate('/todos/new', { state: { background: location } })
              └── "Schedule" → navigate('/schedules/new', { state: { background: location } })
```

### 수정 진입점

- `DayEventList` 아이템 우측 "···" 메뉴 → 수정 / 삭제
- `EventDetailPage` 우상단 "수정" 버튼

### 태그 관리 진입점

TodoForm / ScheduleForm 내 TagSelector → "태그 관리 >" 버튼 → `/tags` (background: form 위치)

---

## 3. 스토어 확장

### 3-1. calendarEventsStore

낙관적 업데이트 메서드 4개 추가. 기존 `fetchEventsForRange` / `loading` 변경 없음.

```ts
addEvent(event: CalendarEvent): void
// eventsByDate에서 이벤트 시간에 해당하는 날짜 키에 추가

removeEvent(uuid: string): void
// eventsByDate 전체를 순회하여 해당 uuid 제거

replaceEvent(uuid: string, next: CalendarEvent): void
// eventsByDate 전체를 순회하여 해당 uuid를 next로 교체
// 반복 이벤트가 여러 날짜에 걸쳐 있는 경우도 처리

refreshCurrentRange(): Promise<void>
// 마지막으로 fetch한 lower/upper 범위를 재조회
// 반복 이벤트 변경(excludeRepeating, scope 수정/삭제) 후 호출
```

`lower` / `upper` 는 스토어 내부에 보존해 `refreshCurrentRange`에서 재사용한다.

### 3-2. eventTagStore

```ts
createTag(name: string, color_hex?: string): Promise<EventTag>
updateTag(id: string, updates: { name?: string; color_hex?: string }): Promise<EventTag>
deleteTag(id: string): Promise<void>
```

성공 시 즉시 `tags` Map 갱신 (낙관적).

### 3-3. currentTodosStore

```ts
addTodo(todo: Todo): void       // is_current Todo 생성 시
removeTodo(uuid: string): void  // 완료/삭제 시
replaceTodo(todo: Todo): void   // 수정 시
```

---

## 4. 컴포넌트 구성

### 4-1. 폼 컴포넌트 계층

```
TodoFormPage / ScheduleFormPage   (라우트 컴포넌트, 모달 래퍼)
└── TodoForm / ScheduleForm       (폼 로직 + 레이아웃)
    ├── 이름 <input>
    ├── TagSelector
    │   └── "태그 관리 >" → /tags
    ├── EventTimePicker            (Todo: 선택, Schedule: 필수)
    │   ├── 타입 탭: at / period / allday
    │   ├── at    : 날짜 + 시간 단일 picker
    │   ├── period: 시작(날짜+시간) / 종료(날짜+시간)
    │   └── allday: 시작 날짜 / 종료 날짜
    └── RepeatingPicker            (선택, EventTime 설정 시에만 활성)
        ├── 토글: 반복 없음(기본) / 반복 ON
        └── 반복 ON:
            ├── 타입: 매일 / 매주 / 매월 / 매년(날짜) / 매년(특정일) / 음력매년
            ├── interval (공통)
            ├── 매주       : 요일 체크박스 (월~일), timeZone
            ├── 매월       : [날짜 선택 | 주차+요일 선택], timeZone
            ├── 매년(날짜) : 월 + 일, timeZone
            ├── 매년(특정일): 월 + 주차 + 요일, timeZone
            ├── 음력매년   : 월 + 일, timeZone
            └── 종료 조건: 없음 / 날짜(end) / 횟수(end_count)
```

### 4-2. 다이얼로그

| 컴포넌트 | 역할 |
|----------|------|
| `TypeSelectorPopup` | FAB 클릭 시 Todo / Schedule 선택 |
| `ConfirmDialog` | 삭제 확인 (제목 + 메시지 prop) |
| `RepeatingScopeDialog` | 반복 이벤트 수정/삭제 범위: 이 이벤트만 / 이후 전체 / 모든 이벤트 |

### 4-3. 파일 구조

```
src/
  components/
    EventTimePicker.tsx
    RepeatingPicker.tsx
    TagSelector.tsx
    ConfirmDialog.tsx
    RepeatingScopeDialog.tsx
    TypeSelectorPopup.tsx
  pages/
    TodoFormPage.tsx        (모달 라우트)
    ScheduleFormPage.tsx
    TagManagementPage.tsx
```

---

## 5. CRUD 로직

### 5-1. 비반복 이벤트

| 동작 | API | 스토어 |
|------|-----|--------|
| 생성 | `createTodo` / `createSchedule` | `addEvent` + `addTodo`(is_current) |
| 수정 | `updateTodo` / `updateSchedule` → 응답으로 교체 | `replaceEvent` + `replaceTodo` |
| 삭제 | `deleteTodo` / `deleteSchedule` | 즉시 `removeEvent` + `removeTodo` (낙관적), 실패 시 rollback |
| 완료(Todo) | `completeTodo` | `removeEvent` + `removeTodo` |

### 5-2. 반복 Schedule

수정 또는 삭제 시 `RepeatingScopeDialog`를 먼저 표시한 뒤 아래 흐름으로 처리:

| scope | 수정 | 삭제 |
|-------|------|------|
| 이 이벤트만 | `excludeRepeating(id, { exclude_repeatings: [turn] })` 후 단건 생성 | `excludeRepeating(id, { exclude_repeatings: [turn] })` |
| 이후 전체 | 기존 시리즈 `end` 잘라내기 + 새 시리즈 생성 | 기존 시리즈 `end` 잘라내기 |
| 모든 이벤트 | `updateSchedule(id, body)` | `deleteSchedule(id)` |

반복 scope 처리 완료 후 → `refreshCurrentRange()` 호출.

### 5-3. 반복 Todo 삭제

`todoApi`에 `excludeRepeating`이 없으므로 단건 제거 API가 존재하지 않는다.

- **삭제**: scope dialog 없이 항상 전체 시리즈 삭제 (`deleteTodo`) + `ConfirmDialog`로 확인
- **단건 제거가 필요한 경우**: "완료"(체크박스)로 처리 — `completeTodo`가 해당 turn만 완료하고 다음 반복을 이어감

### 5-4. 반복 Todo 완료

```ts
completeTodo(id, { origin: todo, next_event_time?, next_repeating_turn? })
```

성공 후 `refreshCurrentRange()`.

---

## 6. 태그 관리

`TagManagementPage` (`/tags`):
- 기존 태그 목록 표시 (색상 + 이름)
- 태그 생성 인라인 입력
- 태그 수정 인라인 (이름 + 컬러 피커)
- 태그 삭제 → `ConfirmDialog`

---

## 7. 테스트 전략

`web/CLAUDE.md` 원칙 준수:

- **스토어 테스트**: API 경계에서 모킹, 공개 접근자(`getState()`) 반환값 검증
  - `addEvent` / `removeEvent` / `replaceEvent` 후 `eventsByDate` 반환값 확인
  - `createTag` 후 `tags` Map 반영 확인
- **컴포넌트 테스트**: 사용자 관점 행동 검증
  - FAB 클릭 → TypeSelectorPopup 표시
  - "Todo" 선택 → 폼 모달 표시
  - 삭제 버튼 → ConfirmDialog 표시
  - 반복 이벤트 수정 → RepeatingScopeDialog 표시
- **RepeatingPicker**: 타입별 옵션 노출 행동 테스트
