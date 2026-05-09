# 3. ServiceAPI 작업 계획 (openAPI + aiFrontAPI)

## 개요
기존 `TodoCalendar-Functions` 레포에 두 가지 추가:
- **openAPI**: AI/외부 Agent용 공개 엔드포인트
- **aiFrontAPI**: 앱 진입점, Agent Loop 실행, FCM 발송

기존 serviceAPI는 변경 없음.

## 디렉토리 구조 (제안)

```
functions/
├── routes/
│   ├── (기존 serviceAPI 라우트들)
│   ├── openapi/              ← 신규
│   │   ├── todoOpenRoutes.js
│   │   ├── scheduleOpenRoutes.js
│   │   └── ...
│   └── ai/                   ← 신규
│       ├── aiCommandRoutes.js
│       └── aiJobRoutes.js
├── controllers/
│   ├── openapi/
│   └── ai/
├── services/
│   ├── openapi/
│   └── ai/
│       ├── agentLoopService.js
│       ├── jobService.js
│       └── tokenUsageService.js
├── middlewares/
│   ├── (기존 firebaseAuth)
│   ├── patAuth.js            ← 신규 (PAT + signed token)
│   └── tokenLimitCheck.js    ← 신규
└── ...
```

## 작업 목록

### 3.1 openAPI 추가

#### 3.1.1 엔드포인트 설계 (AI 친화적)
- [ ] `/v2/open/todos` - 조회/생성/수정/삭제
- [ ] `/v2/open/schedules` - 조회/생성/수정/삭제
- [ ] `/v2/open/tags` - 조회/생성
- [ ] AI가 이해하기 쉬운 응답 포맷 (자연스러운 필드명, 명확한 에러 메시지)
- [ ] 시간대 처리 (ISO 8601 + timezone 명시)

#### 3.1.2 인증
- [ ] PAT 검증 미들웨어 (MCP Server → openAPI 호출 인증)
- [ ] 서명된 userId 토큰 검증 (어떤 유저의 데이터인지)
- [ ] PAT 권한 스코프 정의 (계정 삭제 등 민감 작업 제외)
- [ ] **JWT 검증은 SIGNING_SECRET 기반 HS256 서명 검증만 — 발급자(`iss` claim) 검증 안 함.** 들어오는 토큰이 aiFrontAPI 가 발급한 것이든 MCP 가 외부 OAuth 브릿지 역할로 재서명한 것이든 같은 입구로 받아 처리한다. 발급자별 분기/라우팅은 토큰을 발급·재서명하는 상위 계층(MCP/aiFrontAPI) 책임. openAPI 코드는 발급자 추가/변경에 영향 없음.

#### 3.1.3 보안
- [ ] PAT를 환경변수로 관리, 코드 노출 금지
- [ ] userId 위변조 방지 (서명 검증 필수)
- [ ] Rate Limit (PAT별, userId별)

#### 3.1.4 알려진 한계 (MVP) — 후속 과제 #173
- 일부 단건 조회/수정/삭제 엔드포인트가 자원 owner 검증을 하지 않음. 기존 v1/v2 controller 를 그대로 옮긴 결과로, 호출자가 다른 사용자의 식별자(todoId/eventId/doneId/event_detail eventId)만 알면 그 자원에 접근 가능. 내부 클라이언트(앱)는 자기 데이터만 다루니 무방했지만 외부 호출자 환경에서는 닫아야 함.
- 영향 메서드: `findTodo`, `getEvent`, `loadDoneTodo`, `removeDoneTodo`, `excludeRepeating`, `eventDetail.{findData/putData/removeData}`. 특히 `removeDoneTodo`·event_detail 계열은 service 시그니처 자체가 userId 를 안 받아서 가장 위험.
- MVP 단계는 호출자(MCP, aiFrontAPI) 가 신뢰 가능한 내부 컴포넌트라 외부 노출 전까지 허용. 사용자 PAT 같은 외부 발급 자격증명이 도입되기 전에 반드시 닫는다.
- 후속 과제는 #173 — service 응답 모양 전수조사 → owner 검증 정책 정해서 일괄 적용 + E2E 케이스 추가.

### 3.2 aiFrontAPI 추가

#### 3.2.1 엔드포인트
- [ ] `POST /ai/command`
  - Request: `{ text: String, fcmToken?: String }`
  - Response: `{ jobId: String }` (즉시 반환)
- [ ] `GET /ai/jobs/{jobId}`
  - 응답: `{ status, result? }`
  - 본인 job만 조회 가능 (userId 검증)

#### 3.2.2 Job 관리
- [ ] Firestore `jobs/{jobId}` 컬렉션
  - status, result, userId, createdAt, updatedAt
- [ ] TTL 설정 (예: 24시간 후 자동 삭제)
- [ ] jobId는 UUID v4 (추측 불가능)

#### 3.2.3 Agent Loop 구현 (MCP transport 우회 — lib 직접 호출)
- [ ] `todocalendar-tools` npm 라이브러리 의존성 추가 (GitHub Packages, MCP 레포 산출물)
- [ ] `import { todoTools, scheduleTools, ... } from 'todocalendar-tools/tools'` — Anthropic tool_use 핸들러에 직접 바인딩
- [ ] Tool 목록은 lib export 면에서 정적으로 가져옴 (서버 시작 시 1회 구성)
- [ ] Loop 흐름:
  ```
  while (true) {
    Claude API 호출
    if (end_turn) → 결과 파싱 (DONE/CONFIRM/FAILED)
    if (tool_use) → tool.execute(auth, args) 직접 호출 → 결과 → 다시 Claude
  }
  ```
  - `auth = { userId, source: 'aiFrontAPI', forwardToken: <발급한 HS256 JWT> }` (3.2.7 참고)
  - MCP server 거치지 않음 (인터넷 왕복 절약, 같은 신뢰 영역)
  - CONFIRM·userId 강제·AI 친화 변환은 tool 함수 내부에서 자동 적용 (외부 Agent 경로와 동일)
- [ ] **루프 제한**: 최대 10회, 누적 토큰 50,000 제한
- [ ] System Prompt 작성 (응답 3가지 타입 강제, 오늘 날짜 주입)
- [ ] 비동기 실행 (응답 후 백그라운드 실행)
- [ ] lib 버전 핀 정책 (`package.json` 정확한 버전 고정, major bump 시 통합 테스트)

#### 3.2.4 Firebase Functions 설정
- [ ] AI 전용 Functions 분리
  ```javascript
  export const aiApi = onRequest({
    timeoutSeconds: 300,
    memory: "512MiB"
  }, app)
  ```
- [ ] 기존 serviceAPI는 60초 유지

#### 3.2.5 FCM 발송
- [ ] Job 완료 시 FCM 발송
- [ ] 페이로드: `{ jobId }` 만 (민감 정보 X)
- [ ] FCM 발송 실패 대비 (앱이 폴링으로 fallback)

#### 3.2.6 토큰 사용량 추적
- [ ] Claude API 응답에서 usage 추출
- [ ] `users/{userId}/aiUsage/{YYYY-MM-DD}` 누적
- [ ] 요청 시작 전 한도 체크
- [ ] 한도 초과 시 즉시 FAILED 반환

#### 3.2.7 MCP/openAPI 호출용 JWT 발급 (Firebase 검증 흡수)
- [ ] aiFrontAPI는 Firebase Auth 검증 + HS256 JWT 발급의 **단일 책임자**
- [ ] Claims: `{ sub: uid, iss: 'aiFrontAPI', iat, exp, scope: ['read:calendar', 'write:calendar', ...] }`
- [ ] 알고리즘: HS256 (`SIGNING_SECRET`, openAPI/MCP와 공유)
- [ ] 짧은 TTL (5~10분) — 만료 시 클라이언트가 Firebase Auth로 다시 요청
- [ ] **MCP Server는 Firebase 의존 없음** — aiFrontAPI가 Firebase ↔ JWT 변환 흡수
- [ ] MCP Server는 이 JWT만 검증, openAPI에는 그대로 forward (재발급 불필요)

### 3.3 보안 설계

#### 3.3.1 CONFIRM 응답 서명
- [ ] action에 confirmToken 포함 (HMAC 서명, 5분 유효)
- [ ] serviceAPI에서 토큰 검증 후 실행
- [ ] 클라가 action을 임의 변조해도 서명 불일치로 차단

#### 3.3.2 Prompt Injection 방어
- [ ] Tool 호출 시 userId는 토큰에서 추출 (Claude가 못 바꿈)
- [ ] System Prompt에 명시적 제약 ("다른 유저 데이터 접근 불가")
- [ ] 삭제/대량수정은 강제로 CONFIRM

#### 3.3.3 로깅
- [ ] 모든 Agent Loop 실행 로그 (Cloud Logging)
- [ ] userId, 토큰 등 민감 정보 마스킹
- [ ] 클라 응답에는 추상화된 에러만

### 3.4 환경 변수 / Secrets
- [ ] `ANTHROPIC_API_KEY` - 서버용 Claude API 키
- [ ] `OPENAPI_BASE_URL` - openAPI 주소 (lib의 openapi/client가 호출)
- [ ] `OPENAPI_PAT_AIFRONT` - openAPI 인증용 PAT (aiFrontAPI 자격증명, lib의 openapi/client가 사용)
- [ ] `SIGNING_SECRET` - HS256 JWT 발급/검증 (MCP/openAPI와 공유)
- [ ] **GitHub Packages 인증 토큰** (`.npmrc`) - `todocalendar-tools` lib install용

> `MCP_SERVER_URL` 불필요 — first-party 경로는 MCP transport 우회.

### 3.5 테스트
- [ ] openAPI 단위 테스트
- [ ] Agent Loop 모킹 테스트 (Claude 응답 모킹, lib tool 함수 모킹)
- [ ] 토큰 한도 시나리오
- [ ] CONFIRM 서명 검증 (lib 직접 호출 경로에서도 동일 동작)
- [ ] lib import smoke test — `todocalendar-tools/tools` 정상 import 가능, 핀한 버전과의 export 면 호환성

## 단계별 우선순위

### 1단계 (MVP)
- openAPI 기본 CRUD
- aiFrontAPI 기본 흐름 (jobId, Agent Loop, FCM)
- aiFrontAPI는 `todocalendar-tools/tools` lib을 import해 직접 호출 (MCP transport 우회)
- Firebase Auth → HS256 JWT 변환 책임은 aiFrontAPI 단일

### 2단계
- 토큰 사용량 추적, 플랜 한도
- CONFIRM 서명, 보안 강화
- 로깅, 모니터링

### 3단계
- 외부 공개 시 추가 (Rate Limit, 감사 로그)

### 4단계
- BYOK 지원 (요청 헤더의 API 키 사용)

## 검증 시나리오
1. 단순 생성: "내일 회의 잡아줘" → openAPI 호출 → DONE
2. 조회 후 판단: "이번주 여유 시간에 회의" → get_schedules → 분석 → create
3. 삭제 요청: "회의 삭제" → CONFIRM 반환
4. 한도 초과: 일일 토큰 소진 → FAILED
5. 무한 루프 시도: prompt injection → 루프 제한으로 차단
