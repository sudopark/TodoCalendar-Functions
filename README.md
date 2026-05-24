# TodoCalendar-Functions

TodoCalendar 앱의 Firebase Cloud Functions 백엔드 (REST API).

> 웹 클라이언트는 별도 레포: [TodoCalendar-Web](https://github.com/sudopark/TodoCalendar-Web)

## Tech Stack

- **Runtime:** Node.js 22 (Firebase Cloud Functions)
- **Framework:** Express.js
- **Database:** Cloud Firestore
- **Auth:** Firebase Authentication
- **API Docs:** Swagger UI (`/api-docs`)

## Project Structure

```
functions/
├── index.js            # Express 앱 진입점
├── routes/             # API 라우트 정의 + 의존성 조립 (Composition Root)
├── controllers/        # HTTP 요청/응답 처리
├── services/           # 비즈니스 로직
├── repositories/       # Firestore 읽기/쓰기
├── models/             # 도메인 모델
├── middlewares/        # 인증 미들웨어
├── swagger/            # OpenAPI 스펙
├── test/               # 단위 테스트 + E2E 테스트
└── secrets/            # 환경변수, 서비스 계정 키 (gitignored)
```

## API Endpoints

| Prefix | 리소스 | 설명 |
|--------|--------|------|
| `/v1/accounts` | Account | 계정 생성/삭제 |
| `/v1/todos` | Todo | 할일 CRUD, 완료, 반복 |
| `/v1/todos/dones` | DoneTodo | 완료된 할일 관리 |
| `/v1/schedules` | Schedule | 일정 CRUD, 반복 분기 |
| `/v1/tags` | EventTag | 이벤트 태그 |
| `/v1/event_details` | EventDetail | 이벤트 상세 데이터 |
| `/v1/foremost` | ForemostEvent | 최우선 이벤트 |
| `/v1/sync` | DataSync | 증분 동기화 |
| `/v1/setting` | AppSetting | 사용자 설정 |
| `/v1/holiday` | Holiday | 공휴일 조회 |
| `/v1/migration` | Migration | 데이터 마이그레이션 |
| `/v2/*` | v2 API | 태그 삭제, Todo/Schedule 생성 등 v2 변경분 |
| `/v1/oauth/*` | OAuth 2.1 AS | dynamic client registration (RFC 7591), authorization code + PKCE, token 발급 |
| `/.well-known/*` | OAuth metadata | `oauth-authorization-server` (RFC 8414), `jwks.json` (RFC 7517). 정적 public 데이터 — `Cache-Control: public, max-age=600` |

### 운영 / 구현 spec

라우트 그룹별 상세 spec 문서:

- [serviceAPI](docs/spec/serviceApi.md) — `/v1/*` `/v2/*` 도메인 API (앱 직접 호출)
- [openAPI](docs/spec/openapi.md) — `/v2/open/*` 외부 서비스용 게이트웨이 (PAT + signed user JWT)
- [aiFrontAPI](docs/spec/aiFront.md) — `/v1/ai/*` AI 자연어 명령 + Agent Loop
- [OAuth 2.1 AS](docs/spec/oauth.md) — `/v1/oauth/*` + `/.well-known/*` Authorization Server

### OAuth 운영 정책

**Dynamic client registration dedup (`POST /v1/oauth/register`)** — 같은 `(ip, client_name, redirect_uris)` 조합으로 **1시간 이내** 재등록 요청이 들어오면 신규 client 를 발급하지 않고 **기존 client 를 그대로 반환**. 봇/실수 재시도로 인한 client 누적을 막기 위한 정책.

호출자가 알아야 할 점:
- 응답의 `client_id_issued_at` 은 **최초 등록 시각** (현재 시각 X) — dedup hit 시 과거 timestamp 로 보일 수 있음.
- dedup key 는 metadata 일부 `(ip, client_name, redirect_uris)` 만 본다. 즉 `scope` / `grant_types` / `response_types` / `token_endpoint_auth_method` 만 다르게 박아 재요청해도 dedup hit 으로 흡수돼 신규 값 반영 X.
- 신규 client 가 정말 필요하면 metadata 를 변경해야 함 (가장 간단한 건 `client_name` 다르게).
- TTL 1시간 경과 후엔 같은 hash 라도 새 client 가 발급됨.

구현: `services/oauth/oauthClientService.js` (`_computeDedupHash`, `_isDedupWindow`).

**Token lifetime — access 2시간 / refresh 30일 + rotation + reuse detect**

- `POST /v1/oauth/token` 응답은 access_token (JWT, RS256) + refresh_token (opaque) 동시 발급. `expires_in: 7200` (2시간).
- access_token 만료 후 LLM 호스트가 `grant_type=refresh_token` 으로 새 token 받아옴 (사용자 consent 화면 다시 안 봄). 단 refresh 도 rotation 정책 → 매 사용마다 새 refresh 발급 + 옛 거 즉시 invalidate.
- **Reuse detect (탈취 차단)** — 이미 revoked 된 refresh_token 으로 다시 요청 = 정상 client 면 발생 안 함 = 탈취 신호 → 해당 family 전체 revoke. 정상 client 도 더 못 쓰게 만들어 공격자의 토큰 chain 즉시 무력화.
- refresh_token TTL 30일 absolute (sliding 미적용). 만료 후엔 처음부터 `/authorize` 재시작 필요.

**Revocation (RFC 7009 — `POST /v1/oauth/revoke`)**

- body `{ token, token_type_hint? }`. 인증 없음 (public client).
- 응답은 항상 200 (RFC §2.2) — not-found / 이미 revoked / 잘못된 type 모두 silent.
- MVP 는 refresh_token 만 실제 회수. access_token 은 JWT stateless 라 no-op (자연 만료 = 2시간 내).
- 사용자 권한 철회 시 refresh 만 무력화 → access 도 2시간 내 자연 만료 = 같은 효과.

**Cleanup**

- `oauthClientCleanup` — 24시간 주기, `lastUsedAt=null` AND 30일 초과 client 정리.
- `oauthRefreshTokenCleanup` — 24시간 주기, expired refresh_token 삭제 (`expiresAt < now`).

구현: `services/oauth/refreshTokenService.js` (`issueForUser`, `rotate`, `revoke`).

## Getting Started

### 사전 요구사항

- Node.js 22+
- Firebase CLI (`npm install -g firebase-tools`)
- `functions/secrets/` 디렉토리에 서비스 계정 키 및 `.env` 파일 (에뮬레이터 모드에서는 불필요)

### 설치

```bash
cd functions
npm install
```

### 로컬 개발 (에뮬레이터)

```bash
# 에뮬레이터 시작 (Auth:9099, Functions:5001, Firestore:8080)
npm run emulator

# 또는 프로젝트 루트에서
firebase emulators:start
```

## Testing

```bash
cd functions

# 단위 테스트 (Mocha + assert)
npm test

# 특정 테스트 파일
npx mocha test/services/todoService.test.js

# 에뮬레이터 E2E 테스트 (원커맨드)
npm run test:e2e:run

# 에뮬레이터가 이미 실행 중일 때 E2E만
npm run test:e2e
```

## Deployment

```bash
cd functions
npm run deploy
```

## Architecture

```
routes/ → controllers/ → services/ → repositories/
```

- **Routes**: Express 라우터 + 의존성 조립 (DI 컨테이너 없이 생성자 주입)
- **Controllers**: HTTP 요청/응답 처리, 파라미터 검증
- **Services**: 비즈니스 로직, 의존성 주입 받음
- **Repositories**: Firestore 읽기/쓰기, 도메인 모델 인스턴스 반환

### Cross-Cutting Services

- **EventTimeRangeService**: 이벤트 시간 범위 인덱스 관리
- **DataChangeLogRecordService**: 변경 로그 기록 + 동기화 타임스탬프 갱신
- **DataSyncService**: 클라이언트 증분 동기화 지원
