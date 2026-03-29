# Web Client 환경 설정 설계

## Context

기존 Firebase Cloud Functions REST API 프로젝트에 React 웹 클라이언트를 추가한다. iOS 앱(TodoCalendar)과 유사한 웹 서비스를 제공하기 위한 첫 단계로, 기능 구현 이전에 프로젝트 구조/테스트/배포 환경을 먼저 갖춘다.

**배경:**
- 기존 프로젝트: Firebase Cloud Functions (Node.js 20, Express)
- CLAUDE.md와 docs가 모두 functions 전용 → 계층화 필요
- Firebase Hosting으로 같은 프로젝트에서 서빙

**목표:**
- 모노레포 구조로 functions/web 분리
- 테스트 가능한 웹 프로젝트 구조 (단위 + E2E)
- 로컬 개발 → 에뮬레이터 → 배포까지 워크플로 확립

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 빌드 도구 | Vite |
| 스타일링 | Tailwind CSS |
| 단위/컴포넌트 테스트 | Vitest + React Testing Library |
| E2E 테스트 | Playwright |
| 호스팅 | Firebase Hosting |

## 보안 원칙 (공개 레포)

이 프로젝트는 GitHub에 공개된다. 모든 민감 정보는 은닉한다.

- **Firebase `firebaseConfig`**: `web/.env.local`에 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` 등으로 저장. 코드에서는 `import.meta.env.VITE_FIREBASE_*`로 참조. `.env.local`은 `.gitignore`에 포함.
- **`web/.env.example`**: 키 이름만 기재 (값 없음), 커밋하여 구조 공유.
- **서비스 계정 키**: `functions/secrets/`는 기존대로 `.gitignore`에 포함.
- **웹 secrets 디렉토리**: `web/secrets/`를 생성하고 `.gitignore`에 추가. 추후 필요한 민감 파일 저장용.
- **환경 변수 주의**: Vite는 `VITE_` prefix 변수를 클라이언트 번들에 포함시킴. 서버 전용 비밀은 절대 `VITE_` prefix 사용 금지.

## 진행 순서

Top-Down 방식: 문서 구조 정리 → 프로젝트 생성 → 테스트 환경 → Firebase 연결

---

## 단계 1: CLAUDE.md & docs 계층화

### 1-1. 루트 CLAUDE.md 변환

기존 루트 `CLAUDE.md`의 functions 전용 내용을 `functions/CLAUDE.md`로 이동하고, 루트에는 모노레포 전체 개요만 남긴다.

**루트 CLAUDE.md 내용:**
```markdown
# CLAUDE.md

## Project Overview
Firebase 기반 Todo/Calendar 서비스의 모노레포. REST API(Cloud Functions)와 웹 클라이언트(React)로 구성.

## Project Structure
- `functions/` — Cloud Functions (Node.js 20, Express). 세부 가이드: `functions/CLAUDE.md`
- `web/` — React 웹 클라이언트 (Vite + TypeScript). 세부 가이드: `web/CLAUDE.md`
- `docs/` — 설계 문서 (functions/, web/ 별 plans/specs)
- `firebase.json` — Functions + Hosting + Emulators 통합 설정

## Common Commands
# 전체 에뮬레이터 (Functions + Hosting + Firestore + Auth)
firebase emulators:start

# Functions만 배포
firebase deploy --only functions

# Hosting만 배포
cd web && npm run build && cd .. && firebase deploy --only hosting

# 전체 배포
cd web && npm run build && cd .. && firebase deploy
```

### 1-2. functions/CLAUDE.md 생성

기존 루트 CLAUDE.md의 내용을 그대로 `functions/CLAUDE.md`로 이동. Commands 섹션의 경로 설명(`functions/ 디렉토리에서 실행`)은 유지.

### 1-3. docs 디렉토리 재구성

```
docs/superpowers/plans/*   → docs/functions/plans/*
docs/superpowers/specs/*   → docs/functions/specs/*
(신규) docs/web/plans/
(신규) docs/web/specs/
```

기존 `docs/superpowers/` 디렉토리는 이동 후 삭제.

---

## 단계 2: Vite + React + TypeScript 프로젝트 생성

### 2-1. 프로젝트 스캐폴딩

```bash
npm create vite@latest web -- --template react-ts
cd web && npm install
```

### 2-2. Tailwind CSS 설정

```bash
npm install -D tailwindcss @tailwindcss/vite
```

`vite.config.ts`에 Tailwind 플러그인 추가, `src/index.css`에 `@import "tailwindcss"` 추가.

### 2-3. 초기 디렉토리 구조

```
web/
├── src/
│   ├── main.tsx           # 엔트리포인트
│   ├── App.tsx            # 루트 컴포넌트
│   ├── index.css          # Tailwind 임포트
│   └── vite-env.d.ts      # Vite 타입
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

Vite가 생성하는 데모 파일(assets, App.css, logo 등)은 정리.

### 2-4. web/CLAUDE.md 작성

웹 프로젝트 전용 가이드:
- Commands (dev, build, test, test:e2e)
- 아키텍처 개요 (추후 기능 구현 시 확장)
- 테스트 전략
- 스타일링 규칙

---

## 단계 3: 테스트 환경 구축

### 3-1. Vitest + React Testing Library

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**vitest.config.ts** (또는 vite.config.ts에 통합):
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
})
```

**tests/setup.ts:**
```typescript
import '@testing-library/jest-dom'
```

**샘플 테스트 (tests/App.test.tsx):**
```typescript
import { render, screen } from '@testing-library/react'
import App from '../src/App'

test('renders app', () => {
  render(<App />)
  expect(screen.getByRole('heading')).toBeInTheDocument()
})
```

### 3-2. Playwright

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
  },
})
```

**샘플 E2E 테스트 (e2e/app.spec.ts):**
```typescript
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Todo/)
})
```

### 3-3. npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 단계 4: Firebase Hosting 연결

### 4-1. firebase.json 수정

```json
{
  "hosting": {
    "public": "web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/v1/**", "function": "api" },
      { "source": "/v2/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "emulators": {
    "hosting": { "port": 5000 },
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "singleProjectMode": true
  },
  "firestore": { "...기존 유지" },
  "functions": [ "...기존 유지" ]
}
```

### 4-2. Hosting Rewrite 동작 방식

Rewrite는 Firebase 인프라 내부 라우팅이다. HTTP 프록시가 아니라 Cloud Functions를 직접 invoke한다.

- 브라우저 → `project.web.app/v1/todos` → Hosting이 rewrite 매칭 → `exports.api` Express 함수 직접 실행
- 기존 iOS 앱 → `cloudfunctions.net/api/v1/todos` → 동일한 Express 함수 실행
- 두 경로는 독립적. 기존 앱/Functions 코드에 영향 없음.
- 같은 도메인이므로 CORS 설정 불필요.

### 4-3. 에뮬레이터 통합 확인

```bash
# 웹 빌드 후 전체 에뮬레이터 시작
cd web && npm run build && cd ..
firebase emulators:start
# → localhost:5000 에서 웹앱 확인
# → localhost:5001 에서 API 확인
```

### 4-4. .gitignore 업데이트

루트 `.gitignore`에 추가:
```
web/dist/
web/node_modules/
.superpowers/
```

---

## 검증 방법

각 단계별 확인:

1. **docs/CLAUDE.md 계층화 후**: `functions/CLAUDE.md` 존재 확인, `docs/functions/`와 `docs/web/` 디렉토리 확인
2. **Vite 프로젝트 생성 후**: `cd web && npm run dev` → localhost:5173 접속 확인
3. **테스트 환경 후**: `cd web && npm test` (Vitest 통과), `cd web && npm run test:e2e` (Playwright 통과)
4. **Firebase Hosting 후**: `cd web && npm run build && cd .. && firebase emulators:start` → localhost:5000 에서 웹앱 서빙 확인

## 주요 파일 목록

| 파일 | 작업 |
|------|------|
| `CLAUDE.md` (루트) | 전체 개요로 재작성 |
| `functions/CLAUDE.md` | 신규 생성 (기존 루트 내용 이동) |
| `web/CLAUDE.md` | 신규 생성 |
| `firebase.json` | hosting + emulator hosting 추가 |
| `docs/functions/` | 기존 docs/superpowers/ 이동 |
| `docs/web/` | 신규 디렉토리 |
| `web/vite.config.ts` | Vite + Vitest + Tailwind 설정 |
| `web/playwright.config.ts` | Playwright 설정 |
| `web/tests/setup.ts` | 테스트 설정 |
| `.gitignore` | web/dist, .superpowers 추가 |
