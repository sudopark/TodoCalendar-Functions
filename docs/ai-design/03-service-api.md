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

#### 3.1.3 보안
- [ ] PAT를 환경변수로 관리, 코드 노출 금지
- [ ] userId 위변조 방지 (서명 검증 필수)
- [ ] Rate Limit (PAT별, userId별)

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

#### 3.2.3 Agent Loop 구현
- [ ] MCP Client 연결 (`@modelcontextprotocol/sdk`)
- [ ] Tool 목록 캐싱 (서버 시작 시 1회)
- [ ] Loop 흐름:
  ```
  while (true) {
    Claude API 호출
    if (end_turn) → 결과 파싱 (DONE/CONFIRM/FAILED)
    if (tool_use) → MCP callTool → 결과 → 다시 Claude
  }
  ```
- [ ] **루프 제한**: 최대 10회, 누적 토큰 50,000 제한
- [ ] System Prompt 작성 (응답 3가지 타입 강제, 오늘 날짜 주입)
- [ ] 비동기 실행 (응답 후 백그라운드 실행)

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
- [ ] `MCP_SERVER_URL` - 분리된 MCP Server 주소
- [ ] `OPENAPI_PAT` - openAPI 호출용 PAT
- [ ] `SIGNING_SECRET` - 토큰 서명용 시크릿

### 3.5 테스트
- [ ] openAPI 단위 테스트
- [ ] Agent Loop 모킹 테스트 (Claude 응답 모킹)
- [ ] 토큰 한도 시나리오
- [ ] CONFIRM 서명 검증

## 단계별 우선순위

### 1단계 (MVP)
- openAPI 기본 CRUD
- aiFrontAPI 기본 흐름 (jobId, Agent Loop, FCM)
- Firebase Auth 검증만 (MCP 인증은 단순하게)

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
