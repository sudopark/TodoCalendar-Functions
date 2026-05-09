# 4. MCP Server 작업 계획

## 개요
**별도 레포 (예: `TodoCalendar-MCP`)** 로 구축.
- aiFrontAPI에서 호출 (first-party)
- 외부 Agent에서도 호출 (외부 공개 시점에)
- 두 가지 인증 방식 모두 지원
- Tool 정의는 여기 한 곳에 집중

## 기술 스택
- Runtime: Node.js 22+
- SDK: `@modelcontextprotocol/sdk`
- Transport: Streamable HTTP (HTTP 기반, 배포 쉬움)
- 호스팅: Firebase Functions / Cloud Run / 별도 서버 (선택)

## 디렉토리 구조 (제안)

```
TodoCalendar-MCP/
├── src/
│   ├── server.ts              # MCP Server 진입점
│   ├── tools/                 # Tool 정의
│   │   ├── todoTools.ts
│   │   ├── scheduleTools.ts
│   │   ├── tagTools.ts
│   │   └── index.ts
│   ├── auth/
│   │   ├── firebaseAuth.ts    # Firebase Auth 토큰 검증
│   │   └── oauth.ts           # OAuth (외부 공개 시)
│   ├── openapi/
│   │   └── client.ts          # openAPI 호출 래퍼
│   ├── middleware/
│   │   └── authMiddleware.ts  # 두 가지 인증 통합
│   └── config.ts
├── package.json
├── tsconfig.json
├── README.md
└── .env.example
```

## 작업 목록

### 4.1 기본 MCP Server 구축

#### 4.1.1 프로젝트 초기 설정
- [ ] 신규 레포 생성: `TodoCalendar-MCP`
- [ ] `@modelcontextprotocol/sdk` 설치
- [ ] TypeScript 설정 (선택)
- [ ] Streamable HTTP transport 사용

#### 4.1.2 Tool 정의
TodoCalendar의 핵심 기능을 Tool로 노출:

- [ ] **조회 계열**
  - `get_todos`: 할일 목록 조회 (필터: 기간, 태그, 완료 여부)
  - `get_schedules`: 일정 조회 (기간 범위)
  - `get_tags`: 태그 목록
  - `get_event_details`: 특정 이벤트 상세

- [ ] **생성 계열**
  - `create_todo`: 할일 생성
  - `create_schedule`: 일정 생성
  - `create_tag`: 태그 생성

- [ ] **수정 계열**
  - `update_todo`: 할일 수정
  - `update_schedule`: 일정 수정
  - `complete_todo`: 할일 완료 처리

- [ ] **삭제 계열** (CONFIRM 강제 대상)
  - `delete_todo`
  - `delete_schedule`

각 Tool은 `input_schema`를 명확히 정의 (AI가 정확히 이해할 수 있도록).

#### 4.1.3 openAPI 클라이언트
- [ ] openAPI 호출 래퍼
- [ ] PAT 헤더 자동 주입
- [ ] userId를 서명된 토큰으로 변환해서 전달
- [ ] 에러 핸들링 (openAPI 에러 → MCP 에러로 변환)

### 4.2 인증 레이어

#### 4.2.1 Firebase Auth 검증 (1단계, first-party용)
- [ ] Firebase Admin SDK 초기화
- [ ] 요청 헤더에서 토큰 추출
- [ ] `verifyIdToken()` 으로 검증
- [ ] 검증 성공 시 userId 추출 → context에 저장

```typescript
async function authenticateFirebase(token: string) {
  const decoded = await admin.auth().verifyIdToken(token)
  return { userId: decoded.uid, source: 'first-party' }
}
```

#### 4.2.2 통합 인증 미들웨어
- [ ] 토큰 형식에 따라 분기
- [ ] Firebase 토큰 우선 시도, 실패하면 OAuth (단계 3에서 추가)
- [ ] 인증 실패 시 401 반환

```typescript
async function authenticate(req) {
  const token = extractToken(req)
  
  // first-party (Firebase Auth)
  try {
    return await authenticateFirebase(token)
  } catch {}
  
  // 외부 Agent (OAuth, 3단계)
  try {
    return await authenticateOAuth(token)
  } catch {}
  
  throw new UnauthorizedError()
}
```

### 4.3 Tool 실행 흐름

```typescript
server.setRequestHandler(CallToolRequestSchema, async (req, ctx) => {
  // 1. 인증 (이미 미들웨어에서 처리됨)
  const { userId } = ctx.auth
  
  // 2. Tool 실행
  const tool = tools[req.params.name]
  
  // 3. openAPI 호출 (userId 강제 주입)
  const result = await tool.execute({
    ...req.params.arguments,
    userId  // Claude가 못 바꿈
  })
  
  // 4. 결과 반환
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})
```

### 4.4 OAuth 2.0 (3단계, 외부 공개 시)

#### 4.4.1 OAuth 서버 구축
- [ ] Authorization Code Flow 구현
- [ ] 동의 화면 (외부 Agent용)
- [ ] first-party는 동의 자동 스킵 (client_id로 식별)
- [ ] 액세스 토큰 / 리프레시 토큰 발급
- [ ] PKCE 지원

#### 4.4.2 스코프 정의
- [ ] `read:todos`, `write:todos`
- [ ] `read:schedules`, `write:schedules`
- [ ] `delete:*` (별도 동의 필요)

#### 4.4.3 토큰 검증
- [ ] JWT 또는 opaque 토큰 검증
- [ ] 스코프별 권한 체크
- [ ] 만료/취소 처리

### 4.5 Rate Limiting (3단계)
- [ ] 토큰별 / 유저별 / IP별 제한
- [ ] first-party는 별도 정책 (덜 엄격)
- [ ] Redis 또는 Firestore 카운터

### 4.6 감사 로그 (3단계)
- [ ] 모든 Tool 호출 로그
- [ ] userId, toolName, arguments, timestamp, source
- [ ] 침해 사고 추적용

### 4.7 배포

#### 옵션 A: Firebase Functions (간단)
- 같은 인프라, 관리 통합
- HTTP Trigger Function으로 배포

#### 옵션 B: Cloud Run / 별도 서버 (확장성)
- 더 큰 메모리, 긴 실행시간 가능
- 자체 도메인 부여 (예: `mcp.todocalendar.app`)

권장: **1단계는 Firebase Functions, 외부 공개 시 Cloud Run 검토**

### 4.8 환경 변수
- [ ] `OPENAPI_BASE_URL` - openAPI 주소
- [ ] `OPENAPI_PAT` - openAPI 인증용 PAT
- [ ] `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin SDK용
- [ ] `SIGNING_SECRET` - userId 토큰 서명
- [ ] (3단계) OAuth 관련 secrets

### 4.9 외부 Agent 연결 가이드 (문서화)
- [ ] Claude Desktop 설정 예시
  ```json
  {
    "mcpServers": {
      "todocalendar": {
        "url": "https://mcp.todocalendar.app/mcp"
      }
    }
  }
  ```
- [ ] 사용 가능한 Tool 목록 문서
- [ ] 인증 절차 안내

## 단계별 우선순위

### 1단계 (MVP)
- 기본 MCP Server (Streamable HTTP)
- 핵심 Tool 정의 (CRUD)
- Firebase Auth 검증만

### 2단계
- Tool 추가 (반복, 동기화 등)
- 에러 처리 강화
- 로깅 정비

### 3단계 (외부 공개)
- OAuth 2.0 서버
- 동의 화면
- Rate Limiting
- 감사 로그
- 외부 도메인 / Cloud Run 이전 검토

## 검증 시나리오

### first-party
1. aiFrontAPI에서 Firebase 토큰으로 호출 → Tool 실행 → 정상 응답
2. 잘못된 토큰 → 401
3. userId 변조 시도 → 토큰의 userId가 강제 적용되어 차단

### 외부 Agent (3단계)
1. Claude Desktop에 URL 등록 → OAuth 동의 → 연결 완료
2. "내 일정 보여줘" → get_schedules 실행 → 응답
3. 토큰 만료 → 자동 갱신
4. Rate Limit 초과 → 429 반환

## 의존성
- openAPI 엔드포인트 확정
- Firebase Admin SDK 키 발급
- (3단계) OAuth 동의 화면 디자인

## 참고
- MCP 공식 문서: https://modelcontextprotocol.io
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
