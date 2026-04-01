# Phase 6: Done Todos + EventDetail 편집 + 설정 — 설계 문서

> 브랜치: `feature/104-phase6-settings`  
> 날짜: 2026-04-01

---

## 범위

- **네비게이션**: 상단 Header 바 + 신규 라우트 2개
- **Done Todos 페이지** (`/done`): 완료 Todo 무한 스크롤 목록, 되돌리기/삭제
- **EventDetail 인라인 편집**: 장소/URL/메모 인라인 편집 + Foremost 토글
- **Settings 페이지** (`/settings`): 기본 태그 색상, 계정 정보, 로그아웃/계정 삭제

---

## 1. 네비게이션 & 라우팅

### Header 컴포넌트 (`src/components/Header.tsx`)

- 상단 고정 바. 로고(앱 이름) 왼쪽, 탭 링크 오른쪽.
- 탭: "캘린더"(`/`), "Done"(`/done`), "설정"(`/settings`)
- `React Router <NavLink>`로 active 탭 하이라이트 자동 처리.
- AuthGuard 내부에 위치해 로그인 후에만 표시.

### 라우팅 (`App.tsx`)

```
/            → MainPage       (기존, AuthGuard)
/events/:id  → EventDetailPage (기존, 모달 overlay 유지)
/done        → DoneTodosPage  (신규, AuthGuard)
/settings    → SettingsPage   (신규, AuthGuard)
```

### 레이아웃

- Header가 모든 보호된 페이지 상단에 고정.
- MainPage 기존 구조(ForemostEventBanner + CurrentTodoList + DayEventList) 유지.
- EventDetailPage 모달 overlay는 Header 위에 덮임 (z-index).

---

## 2. Done Todos 페이지

### 스토어 (`src/stores/doneTodosStore.ts`)

| 상태 | 타입 | 설명 |
|------|------|------|
| `items` | `DoneTodo[]` | 로드된 완료 Todo 목록 |
| `cursor` | `string \| null` | 다음 페이지 커서 |
| `hasMore` | `boolean` | 추가 로드 가능 여부 |
| `isLoading` | `boolean` | 로딩 중 여부 |

액션:
- `fetchNext()` — cursor 기반으로 다음 페이지 로드, items에 append
- `revert(id)` — POST revert API → items에서 제거 → `currentTodosStore` 재fetch
- `remove(id)` — DELETE API → items에서 제거
- `reset()` — 상태 초기화 (페이지 마운트 시 호출)

### 페이지 (`src/pages/DoneTodosPage.tsx`)

- 상단: "완료된 할 일" 타이틀
- 목록: DoneTodo 카드 (이름, 완료 시각 `done_at`, 태그 컬러)
- 각 항목: "되돌리기" 버튼, "삭제" 버튼 (삭제는 기존 ConfirmDialog 재사용)
- 하단 sentinel div에 `IntersectionObserver` → 뷰포트 진입 시 `fetchNext()` 트리거
- `hasMore === false`이면 "모두 표시됨" 문구
- 페이지 마운트: `reset()` → `fetchNext()` (첫 페이지 로드)
- 페이지 언마운트: `reset()` (다음 방문 시 새로 로드)

### 데이터 흐름

```
mount → reset() + fetchNext()
scroll to sentinel → fetchNext() (hasMore일 때만)
revert(id) → API → items 제거 → currentTodosStore.fetch() 재호출
remove(id) → API → items 제거
```

---

## 3. EventDetail 인라인 편집

### 편집 대상

- **편집 가능**: `place`, `url`, `memo` (EventDetail 전용 필드)
- **편집 불가**: 이름, 태그, 시간, 반복 정보 (Phase 5 CRUD 폼으로 별도 커버)

### UI 상태 (`isEditing: boolean` 로컬 상태)

```
읽기 모드
  → [편집] 버튼 클릭 → isEditing = true
  → place/url/memo → input / textarea 전환
  → [저장] [취소] 버튼 등장

저장
  → PUT /v1/event_details/:id
  → 성공: isEditing = false, 로컬 state 갱신

취소
  → isEditing = false, 입력값 원복
```

### Foremost 토글

- EventDetailPage 하단에 "고정 이벤트로 설정" / "고정 해제" 버튼
- 현재 foremost event id와 일치하면 "고정 해제", 아니면 "고정 설정"
- `foremostEventStore.set(eventId)` / `foremostEventStore.remove()` 호출
- MainPage `ForemostEventBanner` 자동 갱신 (store 공유)

---

## 4. Settings 페이지

### 페이지 (`src/pages/SettingsPage.tsx`)

3개 섹션으로 구성:

#### ① 기본 태그 색상

- 마운트 시 GET `/v1/setting/event/tag/default/color` 로드
- 프리셋 팔레트에서 슬롯별 색상 선택 (TagManagementPage와 동일한 ColorPalette 컴포넌트 재사용)
- "저장" 버튼 → PATCH `/v1/setting/event/tag/default/color`
- 슬롯 개수: API 응답 배열 길이 기준

#### ② 계정 정보

- `authStore`에서 `account.id` / 이메일 표시 (읽기 전용)

#### ③ 로그아웃 / 계정 삭제

- "로그아웃" → `authStore.signOut()` → `/login` 리디렉트
- "계정 삭제" → ConfirmDialog (위험 액션 강조 스타일) → DELETE `/v1/accounts/account` → `authStore.signOut()`

### ColorPalette 컴포넌트 (`src/components/ColorPalette.tsx`, 신규)

- Props: `colors: string[]` (프리셋 hex 목록), `selected: string`, `onChange: (hex: string) => void`
- 기본 태그 색상 설정(Settings)과 향후 TagManagement에서 재사용
- 프리셋 색상 목록은 `web/src/models/DefaultTagColors.ts`에 정의된 값 사용

---

## 구현 순서 (Option A: 파트별 독립 커밋)

1. **Header + 라우팅** — `Header.tsx` + `App.tsx` 라우트 추가
2. **Done Todos** — `doneTodosStore.ts` + `DoneTodosPage.tsx`
3. **EventDetail 편집** — `EventDetailPage.tsx` 편집 모드 + Foremost 토글
4. **Settings** — `ColorPalette.tsx` 분리 + `SettingsPage.tsx`

---

## 검증 기준

- [ ] Header 탭 클릭 → 올바른 페이지로 이동, active 탭 하이라이트
- [ ] Done Todos: 무한 스크롤 동작, 되돌리기 후 CurrentTodoList 갱신
- [ ] EventDetail: 편집 → 저장 → 새로고침 후 유지
- [ ] Foremost 설정 → MainPage 배너 갱신
- [ ] Settings: 색상 저장 → 재진입 시 유지, 로그아웃 정상 동작
