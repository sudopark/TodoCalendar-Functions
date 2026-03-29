# CLAUDE.md — web

This file provides guidance for the React web client (`web/`).

## Commands

All commands run from the `web/` directory:

```bash
# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit/component tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Run E2E tests (Playwright, requires dev server running or starts automatically)
npm run test:e2e

# Playwright UI mode
npm run test:e2e:ui
```

## Architecture Overview

React 19 + TypeScript 웹 클라이언트. Vite 빌드, Tailwind CSS 스타일링.

```
src/
├── App.tsx         # 루트 컴포넌트
├── main.tsx        # 엔트리포인트
└── index.css       # Tailwind 임포트
tests/              # Vitest 단위/컴포넌트 테스트
e2e/                # Playwright E2E 테스트
```

## Testing Strategy

- **단위/컴포넌트 테스트**: Vitest + React Testing Library (`tests/`)
- **E2E 테스트**: Playwright (`e2e/`)

## Testing Philosophy (최상위 원칙)

**테스트는 구현을 검증하는 것이 아니라 객체/컴포넌트의 역할과 동작을 검증한다.**

### 구조: given / when / then

모든 테스트는 세 단계로 작성한다:

```ts
it('특정 조건에서 어떤 동작을 하면 어떤 결과가 나온다', async () => {
  // given: 초기 상태 설정 (mock 반환값, store 초기화 등)
  // when: 테스트 대상 동작 실행 (render, click, store 메서드 호출 등)
  // then: 결과 검증 (화면에 보이는 텍스트, store 공개 접근자 반환값 등)
})
```

- 테스트 이름은 "어떤 상황에서 → 어떤 동작을 하면 → 어떤 결과가 나온다"로 작성

### 모킹 경계

기본 원칙은 **가능한 한 외부 경계(API 레이어)에서 모킹**한다. 실제 스토어가 동작하게 두면 컴포넌트–스토어 통합을 함께 검증할 수 있다.

```ts
// ✅ 기본: API 경계에서 모킹, 실제 스토어 동작
vi.mock('../../src/api/todoApi', () => ({ todoApi: { getTodos: async () => [] } }))
```

단, 다음 상황에서는 스토어 모킹이 합리적인 선택이다:
- 컴포넌트가 의존하는 스토어가 많아서 API 모킹 셋업이 과도하게 복잡해질 때
- 컴포넌트 자체의 렌더링 로직을 집중적으로 테스트하고 싶고, 데이터 흐름은 스토어 테스트에서 이미 검증된 경우
- 특정 스토어 상태(에러, 로딩 완료 등)를 정밀하게 제어해야 할 때

```ts
// ✅ 스토어 모킹이 적합한 경우: 컴포넌트 렌더링 로직 집중 테스트
vi.mocked(useAuthStore).mockReturnValue({ account: null, loading: true } as any)
```

어떤 경계를 선택하든 **검증 대상은 항상 동작과 결과**여야 한다. 모킹 경계가 달라도 호출 횟수·인자 검증은 금지한다.

### 검증 대상: 공개 인터페이스와 사용자 관점

- **스토어 테스트**: `store.getState().<공개 접근자>` 반환값으로 검증한다
- **컴포넌트 테스트**: 사용자 관점에서 "보이는 것"과 "상호작용 결과"만 검증 (`getByRole`, `getByText` 우선)
- 리팩토링 후에도 테스트가 깨지지 않아야 한다 — 깨진다면 구현을 테스트하고 있다는 신호

### 금지 패턴

| 패턴 | 이유 |
|------|------|
| `expect(fn).toHaveBeenCalledTimes(n)` | 호출 횟수는 구현 세부사항 |
| `expect(fn).toHaveBeenCalledWith(...)` | 인자 검증도 구현 세부사항 |
| `expect(store.loading).toBe(true/false)` | 로딩 상태는 내부 구현 |
| `expect(map.size).toBe(n)` | 내부 자료구조 크기 검증 |
| 스토어/훅 모킹 | API 경계 밖에서 모킹하면 구현에 결합됨 |

## Styling Rules

- Tailwind CSS 유틸리티 클래스 우선 사용
- 커스텀 CSS는 `index.css`에 최소한으로 추가
- `VITE_` prefix 환경 변수만 클라이언트 번들에 포함됨 — 서버 전용 비밀은 절대 `VITE_` prefix 사용 금지

## Security

- Firebase 설정은 `web/.env.local`에 보관 (gitignore 대상)
- `web/.env.example`에 키 이름만 커밋하여 구조 공유
- `web/secrets/`는 민감 파일 저장용 (gitignore 대상)
