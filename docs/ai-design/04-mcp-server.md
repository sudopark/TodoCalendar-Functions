# 4. MCP Server 작업 계획

## 개요
**별도 레포 (`TodoCalendar-MCP`)** 에서 두 산출물을 만든다:
- **MCP Server** (Cloud Run 배포) — 외부 AI Agent (Claude Desktop, Cursor 등) 전용
- **`todocalendar-tools` npm 라이브러리** (GitHub Packages) — `aiFrontAPI` 서버사이드 AI 호스트가 직접 import해 사용 (MCP transport 우회)

같은 tool 함수가 두 transport에서 공유되므로 CONFIRM·userId 강제·AI 친화 변환이 양쪽에서 자동 동일하게 적용된다.

**first-party는 MCP transport 우회.** aiFrontAPI는 `todocalendar-tools/tools` 함수를 Anthropic tool_use 핸들러에 직접 바인딩한다 (인터넷 왕복 절약, 같은 신뢰 영역). MCP server는 외부 AI Agent 전용.

## 기술 스택
- Runtime: Node.js 22+
- SDK: `@modelcontextprotocol/sdk`
- Transport (MCP server): Streamable HTTP
- 호스팅: **Cloud Run** — Google 공식 MCP 호스팅 가이드 존재 (cloud.google.com/run/docs/host-mcp-servers). Firebase Functions는 Hosting rewrite SSE 버퍼링·scale-to-zero 세션 위험·MCP 공식 가이드 부재로 회피
- 패키지 배포: GitHub Packages (`todocalendar-tools`)
- 라이브러리: `jsonwebtoken` (HS256/RS256 검증·발급)
- 단일 버전 / 단일 릴리스: `git tag vX.Y.Z` → CI가 `npm publish` + `gcloud run deploy` 병렬

## 디렉토리 구조 (제안)

```
TodoCalendar-MCP/
├── src/
│   ├── server.ts              # MCP Server 진입점 (Cloud Run 배포 산출물, export X)
│   ├── tools/                 # ★ npm export — todocalendar-tools/tools
│   │   ├── todoTools.ts
│   │   ├── scheduleTools.ts
│   │   ├── tagTools.ts
│   │   └── index.ts
│   ├── auth/                  # MCP 서버 전용 (export X)
│   │   ├── aiFrontAuth.ts     # MVP: HS256 JWT 검증 (iss=aiFrontAPI 화이트리스트, 단일 경로)
│   │   └── oauth.ts           # 3단계: RS256 access_token 검증 (도입 시 aiFrontAuth 교체)
│   ├── openapi/               # ★ npm export — todocalendar-tools/openapi
│   │   └── client.ts          # openAPI 호출 래퍼 (PAT + JWT 첨부)
│   ├── middleware/            # MCP 서버 전용 (export X)
│   │   └── authMiddleware.ts
│   ├── confirm/               # tools에서 사용
│   │   └── token.ts           # CONFIRM action HMAC 서명 (5분 유효)
│   └── config.ts
├── package.json               # name=todocalendar-tools, exports={"./tools":..., "./openapi":...}
├── tsconfig.json
├── README.md
└── .env.example
```

`package.json` `exports` 필드가 외부 공개 면이고 `aiFrontAPI`가 핀하는 surface이므로 함부로 깨지 말 것 (breaking = semver major). 서버 전용 (`server.ts`, `auth/`, `middleware/`)은 export 금지.

## 작업 목록

### 4.1 기본 MCP Server 구축

#### 4.1.1 프로젝트 초기 설정
- [ ] 신규 레포 생성: `TodoCalendar-MCP`
- [ ] `@modelcontextprotocol/sdk` 설치
- [ ] TypeScript 설정 (선택)
- [ ] Streamable HTTP transport 사용

#### 4.1.2 Tool 정의 (`tools/`) — **lib export 면**
TodoCalendar의 핵심 기능을 Tool로 노출. 같은 함수가 MCP transport와 lib 직접 호출에서 공유된다.

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

#### 4.1.3 openAPI 클라이언트 (`openapi/client.ts`) — **lib export 면**
- [ ] openAPI 호출 래퍼
- [ ] PAT 헤더 자동 주입 (`Authorization: Bearer <OPENAPI_PAT_MCP>`)
- [ ] aiFrontAPI 경로(`source='aiFrontAPI'`): 받은 HS256 JWT 그대로 forward (`X-Open-User-Token`)
- [ ] 외부 OAuth 경로(`source='oauth'`): SIGNING_SECRET으로 HS256 JWT 새로 발급 후 첨부
- [ ] 에러 핸들링 (openAPI 에러 → MCP 에러로 변환, AI 친화 메시지 포함)

### 4.2 인증 레이어 — **MCP 서버 전용 (lib export 안 함)**

> **MCP Server는 Firebase Admin SDK 의존 없음.** Firebase Auth 검증은 aiFrontAPI에서 흡수.
> first-party는 MCP transport를 거치지 않으므로(lib 직접 호출 경로), MCP server의 인증 면은 외부 Agent 전용 단일 경로다.
> MVP 구간은 외부 Agent가 아직 없으므로 MCP 자체의 통합/보안 검증을 위해 aiFrontAPI 발급 HS256 JWT만 받는다.
> 3단계에서 OAuth(RS256)로 전환하며 별도 단계에서 재설계 — 두 알고리즘이 동시에 한 엔드포인트에 살지 않음(`iss`로 런타임 분기 불필요).

#### 4.2.1 인증 — MVP (HS256, 통합 검증용)
- aiFrontAPI가 Firebase Auth 검증 → SIGNING_SECRET으로 HS256 JWT 발급 → MCP에 전달
- MCP는 단일 경로로 검증 (분기 없음): SIGNING_SECRET, `algorithms: ['HS256']`, `issuer: 'aiFrontAPI'` 화이트리스트
- 검증된 JWT는 openAPI 호출 시 그대로 forward (재발급 불필요)
- 알고리즘 confusion 방어 — `algorithms` 화이트리스트 명시 필수 (`alg=none`/RS256 위조 차단)

```typescript
function authenticate(req) {
  const token = extractToken(req)
  const decoded = jwt.verify(token, SIGNING_SECRET, {
    algorithms: ['HS256'],
    issuer: 'aiFrontAPI'
  })
  return { userId: decoded.sub, forwardToken: token }
}
```

#### 4.2.2 인증 — 3단계 (RS256 OAuth, 외부 Agent용)
- MCP Server 자체가 OAuth Authorization Server 역할 (RS256 access_token 발급/검증)
- 외부 Agent → MCP Server에 RS256 access_token 첨부 → MCP가 자체 public key로 검증
- 검증 후 SIGNING_SECRET으로 HS256 JWT 새로 발급해 openAPI 호출에 사용
- 도입 시 4.2.1 HS256 검증을 RS256 검증으로 교체 (또는 별도 엔드포인트로 분리). **한 핸들러 안에서 알고리즘/issuer를 분기시키지 말 것** — 알고리즘 confusion 위험·코드 단순성 측면에서 모두 손해

### 4.3 Tool 실행 흐름

같은 `tool.execute(auth, args)` 시그니처를 두 transport에서 공유. transport만 다르고 CONFIRM·userId 강제·AI 친화 변환은 자동 동일.

**MCP transport 경로 (외부 AI Agent)**:
```typescript
server.setRequestHandler(CallToolRequestSchema, async (req, ctx) => {
  // 1. 미들웨어가 채운 인증 컨텍스트
  const auth = ctx.auth  // { userId, source, forwardToken? }

  // 2. Tool 실행 (auth 컨텍스트 전달, userId는 토큰의 sub에서만 — Claude가 못 바꿈)
  const tool = tools[req.params.name]
  const result = await tool.execute(auth, req.params.arguments)

  // 3. 결과 반환
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})
```

**lib 직접 호출 경로 (aiFrontAPI 안에서, MCP 우회)**:
```typescript
// in aiFrontAPI
import { todoTools } from 'todocalendar-tools/tools'

// Firebase Auth 검증 후 자기가 발급한 HS256 JWT
const auth = { userId: firebaseUid, source: 'aiFrontAPI', forwardToken: hs256Jwt }

// Anthropic tool_use 핸들러 안에서 같은 함수를 직접 호출
const result = await todoTools.create_todo.execute(auth, args)
```

### 4.3.1 CONFIRM 흐름 (삭제·대량 수정)
- 삭제 계열 Tool은 즉시 실행 X — `confirmToken` 발급 (HMAC, 5분 유효)
- 클라가 `confirmToken`으로 재호출하면 실행
- CONFIRM은 tool 함수 내부에서 처리 → lib 직접 호출 경로(aiFrontAPI)에도 동일 적용
- 03-service-api.md 3.3.1 참고

### 4.3.2 AI 친화 변환 책임 (Tool 단)
openAPI는 시멘틱 데이터만 노출하고, AI 친화 표현은 **MCP Tool 단**에서 처리:
- timestamp → ISO 8601
- 필드명 단순화 (`uuid` 등 그대로 두되 schema 설명 명시)
- 에러 메시지 명확화 (openAPI 에러 코드 → AI에게 의미 있는 자연어)

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

### 4.7 배포 — Cloud Run + GitHub Packages

**Firebase Functions 비채택**: Hosting rewrite의 SSE 버퍼링·scale-to-zero 세션 위험·MCP 공식 가이드 부재로 회피.

#### 4.7.1 Cloud Run (MCP Server)
- HTTP Trigger 컨테이너로 배포
- 자체 도메인 (예: `mcp.todocalendar.app`)
- 옵션: `--timeout=3600`, `--concurrency`, `--min-instances`

#### 4.7.2 GitHub Packages (`todocalendar-tools` npm lib)
- `package.json` `name: "todocalendar-tools"`, `exports`로 `./tools`, `./openapi`만 노출
- tsconfig 라이브러리 빌드 (`declaration: true`, `outDir: dist`) — 타입 정의 함께 배포
- `publishConfig.registry` + `.npmrc` PAT
- 단일 버전 정책 — semver (export 면 변경은 major)
- aiFrontAPI 측 install 가이드 (PAT 등록·핀 정책)

#### 4.7.3 CI/CD (`vX.Y.Z` 태그 push)
- 두 잡 병렬:
  - Job A: `npm publish` (GitHub Packages)
  - Job B: `gcloud run deploy` (Cloud Run)
- 같은 빌드 산출물 공유 — `tsc` 한 번
- PR/main push에는 build + test + lint만, 배포·publish 없음

### 4.8 환경 변수
- [ ] `OPENAPI_BASE_URL` - openAPI 주소
- [ ] `OPENAPI_PAT_MCP` - openAPI 인증용 PAT (서비스 자격증명, `mcp_<random>` 형식)
- [ ] `SIGNING_SECRET` - HS256 JWT 검증/발급용 (aiFrontAPI/openAPI와 공유)
- [ ] (3단계) OAuth 관련 secrets:
  - `MCP_OAUTH_PRIVATE_KEY` - RS256 access_token 발급용 (Authorization Server 역할)
  - `MCP_OAUTH_PUBLIC_KEY` - RS256 검증용 (자기 검증, JWKS 엔드포인트)

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
- 핵심 Tool 정의 (CRUD, lib export 면)
- aiFrontAPI 발급 HS256 JWT 검증만 (Firebase Admin SDK 의존 없음)
- openAPI 클라이언트 (lib export 면, forward 모드)
- CONFIRM 흐름
- **`todocalendar-tools` 라이브러리 패키징 + GitHub Packages 배포**
- **Cloud Run 배포 + CI/CD (tag → publish + deploy 병렬)**

### 2단계
- Tool 추가 (반복, 동기화 등)
- 에러 처리 강화
- 로깅 정비

### 3단계 (외부 공개)
- OAuth 2.0 Authorization Server (RS256, JWKS 엔드포인트)
- 동의 화면, PKCE
- Rate Limiting (callerId/userId별)
- 감사 로그 (callerId, userId, toolName, arguments, status)

## 검증 시나리오

### first-party (lib 직접 호출 경로 — MVP 핵심)
1. aiFrontAPI에서 `todocalendar-tools/tools` import → 실행 → openAPI 정상 응답. MCP server 우회 확인
2. CONFIRM: 삭제 Tool 호출 → confirmToken 반환 → 재호출 시 실행 (lib 경로에서도 동일)
3. userId 변조 시도: Tool 인자에 userId 넣어도 토큰의 `sub`만 사용

### MCP Server 인증 레이어 (auth 단위 검증)
프로덕션 first-party는 lib 직접 호출 경로만 쓰지만, MCP server의 auth 레이어가 첫날부터 정합성 갖도록 별도 검증.

1. aiFrontAPI 발급 HS256 JWT로 MCP 호출 → Tool 실행 → openAPI 정상 응답 (auth 레이어 통과 확인)
2. 잘못된 `iss` → 401 / 만료 → 401 / 서명 변조 → 401
3. 알고리즘 confusion 방어: HS256 토큰을 RS256으로 위조 시도 → algorithms 화이트리스트로 차단

### 외부 Agent (3단계)
1. Claude Desktop에 URL 등록 → OAuth 인증 → 호출 → 정상
2. 토큰 만료 → 자동 갱신
3. Rate Limit 초과 → 429

### 라이브러리 surface
1. `todocalendar-tools/tools`, `todocalendar-tools/openapi` import 가능 (exports 필드 검증)
2. major bump 시 aiFrontAPI 측 통합 테스트 통과 여부 확인 (export 면 핀 호환)

## 의존성
- openAPI 엔드포인트 확정 (#152)
- aiFrontAPI HS256 JWT 발급 흐름 확정 (#D)
- (3단계) OAuth 동의 화면 디자인

## 참고
- MCP 공식 문서: https://modelcontextprotocol.io
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
