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

## Styling Rules

- Tailwind CSS 유틸리티 클래스 우선 사용
- 커스텀 CSS는 `index.css`에 최소한으로 추가
- `VITE_` prefix 환경 변수만 클라이언트 번들에 포함됨 — 서버 전용 비밀은 절대 `VITE_` prefix 사용 금지

## Security

- Firebase 설정은 `web/.env.local`에 보관 (gitignore 대상)
- `web/.env.example`에 키 이름만 커밋하여 구조 공유
- `web/secrets/`는 민감 파일 저장용 (gitignore 대상)
