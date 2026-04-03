# 웹 MVP 작업 목록

> 세션 재시작 시 이 파일을 기준으로 진행 상태를 파악한다.
> 브랜치 전략: Phase별 `feature/104-phase{N}-*` → `feature/104-web-mvp` 머지

---

## Phase 1: Firebase Auth + 로그인 게이트 ✅

> 브랜치: `feature/104-phase1-auth` | PR: #105

- [x] 의존성 설치 (firebase, react-router-dom, zustand)
- [x] `src/firebase.ts` — Firebase 앱 초기화
- [x] `src/stores/authStore.ts` — Zustand 인증 상태 관리
  - [x] onAuthStateChanged 구독
  - [x] Google/Apple signInWithPopup
  - [x] signOut
  - [x] 리뷰 반영: user → Account 서버 모델
  - [x] 리뷰 반영: catch에 console.warn
  - [x] 리뷰 반영: 계정 등록 호출 테스트 추가
- [x] `src/api/apiClient.ts` — REST API fetch 래퍼
  - [x] Bearer token 자동 첨부
  - [x] 리뷰 반영: tokenProvider 추상화 (Firebase 의존 분리)
  - [x] 리뷰 반영: 204 No Content 처리
  - [x] 리뷰 반영: 테스트 중복 mock 제거
- [x] `src/api/tokenProvider.ts` — 토큰 제공 추상화
- [x] `src/components/AuthGuard.tsx` — 라우트 인증 게이트
- [x] `src/pages/LoginPage.tsx` — Google/Apple 소셜 로그인 UI
- [x] `src/App.tsx` — BrowserRouter + AuthGuard 래핑
- [x] `src/main.tsx` — firebase side-effect import
- [x] `.env.example` — VITE_API_BASE_URL 추가
- [x] `web/CLAUDE.md` — 테스트 원칙 문서화
- [x] PR #105 생성 및 리뷰 반영

---

## Phase 2: API 클라이언트 + TypeScript 데이터 모델

> 브랜치: `feature/104-phase2-api`

### 2-1. TypeScript 데이터 모델 (`src/models/`)

- [x] `EventTime.ts` — at/period/allday discriminated union
- [x] `Repeating.ts` — 반복 설정 (start, option, end?, end_count?)
- [x] `Todo.ts` — { uuid, name, event_tag_id?, event_time?, repeating?, is_current, notification_options? }
- [x] `Schedule.ts` — { uuid, name, event_tag_id?, event_time, repeating?, exclude_repeatings?, notification_options? }
- [x] `EventTag.ts` — { uuid, name, color_hex? }
- [x] `DoneTodo.ts` — { uuid, origin_event_id?, done_at?, name, event_time?, event_tag_id? }
- [x] `EventDetail.ts` — { place?, url?, memo? }
- [x] `ForemostEvent.ts` — { event_id, is_todo }
- [x] `Holiday.ts` — Google Calendar API 응답 (items[].summary/start/end)

### 2-2. 도메인별 API 모듈 (`src/api/`)

- [x] `todoApi.ts` — getTodos, getTodo, createTodo, updateTodo, completeTodo, deleteTodo
- [x] `scheduleApi.ts` — getSchedules, getSchedule, createSchedule, updateSchedule, excludeRepeating, deleteSchedule
- [x] `eventTagApi.ts` — getAllTags, createTag, updateTag, deleteTag
- [x] `holidayApi.ts` — getHolidays(year, locale, code)
- [x] `eventDetailApi.ts` — getEventDetail, updateEventDetail, deleteEventDetail
- [x] `foremostApi.ts` — getForemostEvent, setForemostEvent, removeForemostEvent
- [x] `settingApi.ts` — getDefaultTagColors, updateDefaultTagColors
- [x] `doneTodoApi.ts` — getDoneTodos, deleteDoneTodo, revertDoneTodo

### 2-3. 유틸리티

- [x] `src/utils/eventTimeUtils.ts` — EventTime ↔ Date 변환, 날짜별 이벤트 매핑 헬퍼

### 2-4. 검증

- [x] `tsc -b` 타입 체크 통과
- [x] 전체 테스트 통과 (66개)
- [x] PR 생성 및 리뷰

---

## Phase 3: 이벤트 태그 + 캘린더에 이벤트 표시

> 브랜치: `feature/104-phase3-calendar-events`

### 3-1. Zustand 스토어

- [x] `src/stores/eventTagStore.ts` — 로그인 시 GET /v1/tags/all, ID→태그 캐시
- [x] `src/stores/calendarEventsStore.ts` — fetchEventsForRange(lower, upper), 날짜별 인덱싱
- [x] `src/stores/holidayStore.ts` — GET /v1/holiday/, 연도별 캐시
- [x] `src/stores/uiStore.ts` — selectedDate 등 UI 상태

### 3-2. 캘린더 UI 수정

- [x] `CalendarGrid.tsx` — 날짜 셀에 이벤트 컬러 dot (최대 3개)
- [x] `CalendarGrid.tsx` — 공휴일 빨간 텍스트 표시
- [x] `CalendarGrid.tsx` — 날짜 셀 클릭 → selectedDate 설정
- [x] `MonthCalendar.tsx` — 월 변경 시 fetchEventsForRange 트리거

### 3-3. 검증

- [x] 월 이동 시 API 호출 확인 (lower/upper 타임스탬프)
- [x] 이벤트 있는 날짜에 컬러 dot 표시
- [x] 공휴일 정상 표시
- [x] 기존 테스트 전체 통과
- [ ] PR 생성 및 리뷰

---

## Phase 4: 일별 이벤트 목록 + 이벤트 상세

> 브랜치: `feature/104-phase4-event-list`

### 4-1. 이벤트 목록 컴포넌트

- [ ] `src/components/DayEventList.tsx` — selectedDate의 이벤트 목록 (Todo → Schedule 순)
- [ ] `src/components/CurrentTodoList.tsx` — 시간 없는(current) Todo 목록
- [ ] `src/components/ForemostEventBanner.tsx` — 고정 이벤트 배너
- [ ] `src/components/EventTimeDisplay.tsx` — EventTime 포맷 재사용 컴포넌트

### 4-2. 이벤트 상세

- [ ] `src/pages/EventDetailPage.tsx` — GET /v1/event_details/:id
  - [ ] 이름, 시간 범위, 반복 정보 표시
  - [ ] 태그 컬러 표시
  - [ ] 장소, URL(클릭 가능), 메모 표시

### 4-3. 레이아웃

- [ ] 메인 레이아웃 재구성 — 캘린더(상단/좌) + 이벤트 목록(하단/우)
- [ ] 반응형 처리 (모바일: 상하 배치, 데스크톱: 좌우 배치)

### 4-4. 검증

- [ ] 날짜 선택 → 이벤트 목록 표시
- [ ] 이벤트 클릭 → 상세 보기
- [ ] Current Todo 항상 표시
- [ ] 반응형 동작 확인
- [ ] PR 생성 및 리뷰

---

## Phase 5: Todo/Schedule CRUD

> 브랜치: `feature/104-phase5-crud`

### 5-1. 폼 컴포넌트

- [ ] `src/components/EventTimePicker.tsx` — at/period/allday 타입 선택 + 날짜/시간 입력
- [ ] `src/components/TodoForm.tsx` — 이름, EventTime(선택), 태그, 반복 설정
- [ ] `src/components/ScheduleForm.tsx` — 이름, EventTime(필수), 태그, 반복 설정
- [ ] `src/components/ConfirmDialog.tsx` — 삭제 확인 다이얼로그

### 5-2. CRUD 동작

- [ ] Todo 생성 — POST /v1/todos/todo
- [ ] Todo 수정 — PUT /v1/todos/todo/:id
- [ ] Todo 완료 — POST /v1/todos/todo/:id/complete (체크박스)
- [ ] Todo 삭제 — DELETE /v1/todos/todo/:id
- [ ] Schedule 생성 — POST /v1/schedules/schedule
- [ ] Schedule 수정 — PUT /v1/schedules/schedule/:id
- [ ] Schedule 삭제 — DELETE /v1/schedules/schedule/:id
- [ ] 생성 버튼 (FAB/"+") → 모달로 폼 표시
- [ ] Optimistic update — 성공 시 store 즉시 반영

### 5-3. 태그 관리

- [ ] `src/pages/TagManagementPage.tsx` — 태그 CRUD + 컬러 피커

### 5-4. 검증

- [ ] 시간 없는 Todo 생성 → Current 목록에 표시
- [ ] 특정 날짜 Todo 생성 → 캘린더 해당일에 표시
- [ ] Schedule 생성/수정/삭제
- [ ] Todo 완료 → 목록에서 제거
- [ ] 태그 CRUD, 색상 적용 확인
- [ ] PR 생성 및 리뷰

---

## Phase 6: Done Todos + 이벤트 상세 편집 + 설정

> 브랜치: `feature/104-phase6-settings`

### 6-1. Done Todos

- [ ] `src/pages/DoneTodosPage.tsx` (`/done`) — 완료 목록
- [ ] 되돌리기 — POST /v1/todos/dones/:id/revert
- [ ] 삭제 — DELETE /v1/todos/dones/:id

### 6-2. 이벤트 상세 편집

- [ ] EventDetailPage — 장소/URL/메모 인라인 편집 (PUT /v1/event_details/:id)
- [ ] Foremost event 설정 — "고정" 액션 (PUT /v1/foremost/event)

### 6-3. 설정 페이지

- [ ] `src/pages/SettingsPage.tsx` (`/settings`)
  - [ ] 기본 태그 색상 (GET/PATCH /v1/setting/event/tag/default/color)
  - [ ] 계정 정보 표시
  - [ ] 로그아웃
  - [ ] 계정 삭제 (확인 다이얼로그 + DELETE /v1/accounts/account)

### 6-4. 네비게이션

- [ ] `src/components/Navigation.tsx` — 사이드바/탑 내비 (캘린더, Done, 설정)

### 6-5. 검증

- [ ] Todo 완료 → Done 페이지 표시 → 되돌리기 동작
- [ ] 이벤트 상세 편집 → 새로고침 후 유지
- [ ] Foremost 설정 → 배너 갱신
- [ ] 설정 페이지 정상 동작
- [ ] PR 생성 및 리뷰

---

## Phase 7: 폴리시 + E2E 테스트 + 배포

> 브랜치: `feature/104-phase7-polish`

### 7-0. 전체 TC 검사 (선행 단계)

- [x] 전체 테스트 파일 순회 — 구현 세부사항이 아닌 **역할/행동 중심**으로 작성되어 있는지 검사
- [x] 미흡한 TC 수정 — 상태·구현 결합이 강한 테스트를 행동 중심으로 리라이트
- [x] `npm test` 전체 통과 확인

### 7-1. 에러 핸들링 & UX

- [x] `src/components/ErrorBoundary.tsx` — React 에러 경계
- [x] `src/components/Toast.tsx` — 알림 토스트
- [x] 네트워크 실패/401 처리 (자동 로그아웃 등)
- [x] `src/components/LoadingSkeleton.tsx` — 로딩 스켈레톤

### 7-2. 캐시 데이터 활용 검토

- [x] 각 store의 메모리 캐시(in-memory state)가 효과적으로 재사용되는지 검토
- [x] 이미 로드된 데이터를 불필요하게 다시 fetch하는 경로 식별 및 제거
- [x] 캐시 무효화 기준(범위 이동, CRUD 이후 등)이 적절한지 확인

### 7-3. 스토어 스코프 조정

- [x] 현재 싱글톤으로 유지되는 store 중 특정 페이지/세션 범위에서만 유효한 것 식별
- [x] 해당 store를 컴포넌트 마운트 생명주기에 맞게 스코프 조정 (초기화/해제 포함)
- [x] 변경 후 기존 동작 회귀 없는지 확인

### 7-4. 반응형 디자인

- [x] 375px (모바일) 감사 및 수정
- [x] 768px (태블릿) 감사 및 수정
- [x] 1280px (데스크톱) 감사 및 수정

### 7-5. E2E 테스트

- [x] `e2e/app.spec.ts` — 로그인 리다이렉트 + 소셜 로그인 버튼
- [x] `e2e/calendar.spec.ts` — 미인증 리다이렉트
- [x] `e2e/todo-crud.spec.ts` — 미인증 리다이렉트
- [x] `e2e/schedule-crud.spec.ts` — 미인증 리다이렉트
- [ ] Playwright + Firebase 에뮬레이터 연동 설정 (인증 필요 시나리오는 에뮬레이터 설정 후 추가)

### 7-6. 성능 & 배포

- [x] React.lazy 라우트 분할 (6개 페이지 lazy 로딩)
- [x] useMemo 최적화 (캘린더 그리드 — 이미 적용됨)
- [x] `npm run build` 성공 확인
- [ ] `firebase deploy --only hosting` 배포 검증
- [ ] SPA 라우팅 동작 확인 (새로고침 시 index.html 반환)

### 7-7. 문서

- [x] `web/CLAUDE.md` 아키텍처 업데이트
- [ ] `docs/web/` 구현 스펙 정리
- [ ] 전체 플로우 다이어그램 작성

### 7-8. 검증

- [ ] 에뮬레이터 + E2E 전체 통과
- [ ] 프로덕션 스모크 테스트 (로그인 → Todo 생성 → 캘린더 이동 → 완료 → 로그아웃)
- [ ] PR 생성 및 리뷰

---

## Phase 8: Apple 로그인 환경 설정

- [ ] Apple Developer Console — Service ID 생성 및 Sign in with Apple 활성화
- [ ] Firebase Console — Authentication → Apple provider 활성화 및 Service ID/키 등록
- [ ] Firebase Hosting 도메인을 Apple의 authorized domains에 추가
- [ ] 로컬 에뮬레이터 환경에서 Apple 로그인 테스트
- [ ] 프로덕션 환경에서 Apple 로그인 동작 확인
