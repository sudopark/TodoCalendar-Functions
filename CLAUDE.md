# CLAUDE.md

Firebase Cloud Functions 백엔드 (REST API). 웹 클라이언트는 별도 레포: [TodoCalendar-Web](https://github.com/sudopark/TodoCalendar-Web)

## Commands

All commands run from the `functions/` directory:

```bash
# Run all tests
npm test

# Run a single test file
npx mocha test/services/todoService.test.js

# Run tests matching a pattern
npx mocha --grep "some test description"

# Start local emulator (functions only)
npm run serve

# Deploy to Firebase
npm run deploy

# Run changelog migration script
npm run migrate-changelog

# Emulator E2E Testing
npm run emulator          # Start emulators for manual testing (Auth:9099, Functions:5001, Firestore:8080)
npm run test:e2e          # Run E2E tests (requires emulator already running)
npm run test:e2e:run      # One-command: start emulators → run E2E tests → stop emulators
```

## Architecture Overview

This is a **Firebase Cloud Functions** backend (Node.js 22) serving a Todo/Calendar app. The single exported function `exports.api` in `functions/index.js` is an Express app mounted as an HTTPS handler.

### Layer Structure

```
routes/ → controllers/ → services/ → repositories/
```

- **Routes** (`routes/`): Express routers that also act as **composition roots** — they instantiate and wire together all dependencies (repositories, services, controllers) via constructor injection. There is no DI container. **환경/구성 분기도 여기서만**: `process.env.FUNCTIONS_EMULATOR === 'true'` 같은 emulator/production 분기는 routes(또는 `index.js` 부트스트랩)에서 처리하고, 도메인 레이어(repository/service)는 환경에 무지하게 유지. 환경별 대체 구현은 `repositories/fakes/` 같은 격리된 디렉토리에 두고 routes에서 주입. 예: `routes/holidayRoutes.js`가 emulator일 때 `FakeHolidayRepository`를 주입해 외부 Google Calendar 호출 차단 (PR #187, issue #183).
- **Controllers** (`controllers/`): Handle HTTP request/response, validate required params, and wrap errors in `Errors.Application`. Use `express-async-errors` so async throws are caught automatically.
- **Services** (`services/`): Business logic. Services receive their dependencies injected; never instantiate repositories themselves.
- **Repositories** (`repositories/`): Firestore read/write. Return domain model instances (e.g., `Todo.fromData(snapshot.id, snapshot.data())`). Firebase Admin SDK is initialized once in `index.js`.

### API Versioning

Routes are registered under `/v1/` and `/v2/` prefixes. A `setVersion` middleware sets `req.apiVersion` so services can branch on version where needed (e.g., tag delete behavior differs between v1 and v2).

### Special route groups

위 v1/v2 prefix 외에 두 도메인 한정 라우트 그룹이 별도로 존재. 각자 독립된 인증 체계와 운영 정책을 가짐.

- **openAPI** (`/v2/open/*`) — 외부 서비스를 위한 인증된 API 게이트웨이. PAT (서비스 식별) + signed user JWT (사용자 식별) + `requireScope` (인가). routes 는 `routes/openapi/`, 미들웨어는 `middlewares/openapi/`. 기능 스펙: [`docs/spec/openapi.md`](docs/spec/openapi.md). 운영/시크릿 정책은 "openAPI 시크릿 운영 정책" 섹션.
- **OAuth 2.1 Authorization Server** (`/v1/oauth/*` + `/.well-known/*`) — 외부 OAuth client 에 access_token 발급 (RFC 6749 / 7591 / 7009 / 8414 / 8707 / 7636 / 7638). Firebase Auth 미들웨어 미적용. access_token JWT (RS256, 2h) + refresh_token (opaque, 30d, rotation + reuse detect). PKCE S256 mandatory. routes 는 `routes/oauth/`, 미들웨어는 `middlewares/oauth/`. 기능 스펙: [`docs/spec/oauth.md`](docs/spec/oauth.md). 운영/시크릿 정책은 "OAuth 2.1 Authorization Server 시크릿 운영 정책" 섹션.

### Key Cross-Cutting Services

- **`EventTimeRangeService`** (`services/eventTimeRangeService.js`): Maintains a separate time-range index for every event (todo or schedule). Every create/update/delete must call this service to keep the index in sync. Supports `at`, `period`, and `allday` time types.
- **`DataChangeLogRecordService`** (`services/dataChangeLogRecordService.js`): Records a `DataChangeLog` (CREATED/UPDATED/DELETED) and updates the sync timestamp on every mutation. Called by all mutating services.
- **`DataSyncService`** (`services/dataSyncService.js`): Provides incremental sync via change logs. Clients send their last known timestamp; the server returns pages of changed items.
- **`EventDetailDataService`** (`services/eventDetailService.js`): Wraps two `EventDetailDataRepository` instances — one for active events (`isDone=false`) and one for done todos (`isDone=true`).

### Auth

`middlewares/authMiddleware.js` verifies Firebase ID tokens from the `Authorization: Bearer <token>` header and attaches the decoded token to `req.auth`. Applied to all routes except `/v1/accounts` and `/v1/holiday`.

**OAuth 2.1 Authorization Server** (`/v1/oauth/*` + `/.well-known/*`) 는 별도 라우트 그룹으로 격리 (Firebase Auth 인증 미들웨어 미적용). 외부 OAuth client 에 access_token 발급. 기능 스펙: [`docs/spec/oauth.md`](docs/spec/oauth.md). 운영/시크릿 정책은 아래 "OAuth 2.1 Authorization Server 시크릿 운영 정책" 섹션.

**openAPI** (`/v2/open/*`) 도 별도 라우트 그룹 — Firebase Auth 대신 PAT + signed user JWT 로 인증. 기능 스펙: [`docs/spec/openapi.md`](docs/spec/openapi.md). 운영/시크릿 정책은 아래 "openAPI 시크릿 운영 정책" 섹션.

### Models

Domain model classes live in `models/`. Each has `toJSON()` for serialization (Express auto-calls via `JSON.stringify`) and `fromData(id, data)` for construction from Firestore snapshots. Repositories return model instances, not plain objects.

**Domain models:**
- `models/Todo.js`: Todo with nested `EventTime`, `Repeating` (instanceof check in constructor)
- `models/Schedule.js`: Schedule with nested `EventTime`, `Repeating`
- `models/EventTag.js`: Event tag (uuid, name, color_hex, userId)
- `models/DoneTodo.js`: Completed todo with nested `EventTime`
- `models/ForemostEvent.js`: Composite response (event_id, is_todo, event). Created in service, not repository.
- `models/Account.js`: User account info (uid, email, method, sign-in timestamps)

**Shared value objects:**
- `models/EventTime.js`: Time types — `at`, `period`, `allday`. Used by Todo, Schedule, DoneTodo.
- `models/Repeating.js`: Repeating config — `start`, `option` (opaque), `end`, `end_count`. Used by Todo, Schedule.

**Infrastructure models:**
- `models/DataTypes.js`: String constants `Todo`, `Schedule`, `EventTag`
- `models/DataChangeLog.js`: `DataChangeCase` enum (CREATED/UPDATED/DELETED) and `DataChangeLog` class
- `models/Errors.js`: `BadRequest` (400), `NotFound` (404), `Application` (wraps unknown errors at 500)
- `models/SyncResponse.js`: Response shapes for sync API

### Firestore Chunking Pattern

Firestore `in` queries have a 30-item limit. Whenever loading events by IDs, services chunk arrays into slices of 30 and run `Promise.all` over the chunks. See `Utils/functions.js` for the `chunk` helper.

### Common Pitfalls

- **Firestore admin SDK는 plain object만 받음**: `collectionRef.add(data)` / `set(data)`에 모델 클래스 인스턴스(`EventTime`, `Repeating`, `DoneTodo` 등 — custom prototype을 가진 객체)를 직접 넘기면 `"Couldn't serialize object of type X. Firestore doesn't support JavaScript objects with custom prototypes"`로 throw. `loadXxx`로 읽어 wrap된 모델을 다시 firestore에 쓰는 흐름(예: revert)은 `.toJSON()`이나 destructure로 plain object 변환 후 전달. 발견 사례: PR #145 `services/doneTodoService.js #revertTodoPayload`.

- **async 함수 안의 Promise는 반드시 await 또는 .catch**: 변수에 받기만 하고 await 없이 다른 await를 거치면, 그 Promise가 reject될 때 micro-task 윈도우에서 `unhandledRejection`으로 감지됨. Node 15+ 기본 정책 `--unhandled-rejections=throw`로 함수 인스턴스 종료 → HTTP 응답 못 보내고 클라가 socket hang up(connection reset). async 함수 안 모든 Promise는 명시적 await 또는 `.catch` 처리. 발견 사례: PR #145 `services/doneTodoService.js #runRevertDoneTodo`.

### Testing

Tests use **Mocha + assert** (Node.js built-in). Test doubles live in `test/doubles/`:
- `stubRepositories.js`: Stub implementations for all repositories with `shouldFail*` flags to trigger failure paths. Stubs return model instances (e.g., `TodoModel.fromData()`).
- `spyChangeLogRecordService.js`: Spy that records logged data types and change logs for assertion

**Test double policy — recorders, not validators**: stubs/spies record raw inputs (e.g., `lastPutPayload`) so test cases can assert on them directly. Never bake validation/throw logic into the stub itself — that turns it into a mock and scatters test intent into the double. To catch a regression, expose what the production code actually passes and let the test case verify it. Example: PR #184 (issue #178) — `StubScheduleEventRepository.lastPutPayload` records the raw payload so the test can assert `Object.getPrototypeOf(payload) === Object.prototype`, instead of having the stub throw on custom-prototype inputs.

**Fake/대체 구현 위치 — `repositories/fakes/`로 격리**: emulator runtime이 require해야 하는 fake(예: 외부 API 호출 차단용)는 `test/`에 둘 수 없음 — e2e가 mocha 프로세스에서 firebase emulator가 띄운 함수 프로세스를 외부 호출하는 구조라, fake가 함수 프로세스의 require 경로 안(=production-tree)에 있어야 함. 이때는 `repositories/fakes/` 같은 격리된 디렉토리에 두어 production-tree 안이지만 fake임이 한눈에 드러나게 함. 테스트 코드에서만 쓰는 stub/spy(`test/doubles/`)와 emulator runtime용 fake(`repositories/fakes/`)는 위치/역할이 다름. 예: `repositories/fakes/holidayRepository.js` (PR #187, issue #183).

Tests are organized in `test/services/`, `test/controllers/`, and `test/models/`. Service tests pass stubs via constructor injection. Controller tests use `stubServices.js` (plain objects, independent of repository model changes).

### Emulator E2E Testing

Firebase Emulator Suite(Auth, Functions, Firestore)를 사용한 E2E 테스트 인프라.

**구조:**
```
test/e2e/
├── setup.js                    # global before: 유저 생성, 토큰 발급, Firestore 초기화, .env.test 로드
├── seeds/commonData.js         # 공통 시드 데이터 (TEST_USER_UID 등)
├── helpers/
│   ├── request.js              # Firebase Auth 기반 axios 래퍼 (v1/v2 일반 라우트용)
│   └── openClient.js           # openAPI 용: PAT + 사용자 JWT 부착, 사용자 JWT 발급기
├── openapi/*.e2e.js            # /v2/open/* 시나리오 (todos/schedules/tags/dones/eventDetails/auth)
└── *.e2e.js                    # 그 외 라우트별 E2E
```

**동작 방식:**
- `setup.js`에서 Auth 에뮬레이터에 테스트 유저 생성 → 커스텀 토큰 → ID 토큰 교환 → 모든 테스트에서 사용
- `.mocharc.e2e.yml`로 단위 테스트(`.test.js`)와 E2E 테스트(`.e2e.js`) 설정 분리
- `index.js`는 `FUNCTIONS_EMULATOR` 환경변수로 에뮬레이터/프로덕션 초기화를 분기

**환경 분기 (`index.js`):**
- 에뮬레이터 모드(`FUNCTIONS_EMULATOR=true`): `initializeApp()` (서비스 계정 키 불필요) + `secrets/.env.test` 로드
- 프로덕션 모드: 서비스 계정 키 기반 초기화 + `secrets/.env` 로드

**포트:** Auth(9099), Functions(5001), Firestore(8080)

**참고:**
- Holiday API는 emulator runtime일 때 `routes/holidayRoutes.js`가 `FakeHolidayRepository`를 주입해 외부 Google Calendar 호출 차단. e2e는 빈 `items: []` 응답을 결정적으로 검증
- `npm run emulator`/`test:e2e:run` 스크립트는 내부에서 `cd ..`으로 프로젝트 루트 이동 후 firebase CLI 실행 (firebase.json이 루트에 있으므로)

### Secrets

`functions/secrets/` (gitignore 처리, `.env.test.example`만 예외 커밋):
- `todocalendar-serviceAccountKey.json`: 프로덕션 Firebase Admin 인증서 (프로덕션에서만 필요)
- `.env`: 프로덕션 환경변수 (`HOLIDAY_API_KEY`, `OPENAPI_PAT_MCP`, `SIGNING_SECRET`, `OAUTH_ISSUER`, `OAUTH_SIGNING_PRIVATE_KEY`, `OAUTH_SIGNING_PUBLIC_KEY`, `OAUTH_CALENDAR_RESOURCE_URI`, `OAUTH_CONSENT_URL` 등)
- `.env.test`: 에뮬레이터/E2E 전용 환경변수 (gitignored). 프로덕션 `.env` 와 **값이 절대 같지 않게** dummy/random 으로 운용 (보안 분리). 에뮬레이터 모드에서 `index.js` 가 자동 로드. 가장 빠른 셋업: `cp secrets/.env.test.example secrets/.env.test` 한 번이면 동작 (template 에 dummy 값이 박혀 있음). 값을 바꾸고 싶을 때만 직접 수정.
- `.env.test.example`: `.env.test` 템플릿 (커밋 대상). 알려진 dummy hex pattern (`deadbeef.../cafebabe...`) 이 박혀 있어 그대로 복사만 해도 동작 가능. 새 시크릿 키 추가 시 함께 갱신 + dummy 값까지 같이 박을 것.

#### openAPI 시크릿 운영 정책 (`/v2/open/*`)

기능 스펙은 [`docs/spec/openapi.md`](docs/spec/openapi.md) 참조. 아래는 운영/시크릿 정책만.

`OPENAPI_PAT_MCP` 와 `SIGNING_SECRET` 두 키가 openAPI 인증 체계의 핵심. 운영(`.env`) 과
테스트(`.env.test`) 양쪽에 **반드시 다른 값**으로 둔다 (테스트 dummy 가 운영 인증을 우회하지
못하게).

**OPENAPI_PAT_MCP — PAT(Personal Access Token) secret**
- 호출자(MCP 서비스)가 헤더에 넣는 토큰 형식: `Authorization: Bearer mcp_<secret>`
- 환경변수에는 **prefix 없이 secret 만** 둔다. 예: `OPENAPI_PAT_MCP=abc123...` (X: `mcp_abc123...`)
- 검증 로직(`middlewares/openapi/patAuth.js`): 인입 토큰을 `_` 로 split → secret 부분만
  `crypto.timingSafeEqual` 비교. prefix 가 env 값에 섞이면 절대 일치하지 않음.
- 생성: `openssl rand -hex 32` (32바이트 = 64 hex 문자) — 길이는 32 이상 권장
- 화이트리스트(`KNOWN_SERVICES`): MVP 는 `mcp` 한 종류만. 새 서비스 추가 시 코드 수정 필요.

**SIGNING_SECRET — 사용자 JWT(HS256) 서명키**
- aiFrontAPI(별도 발급 채널) 가 발급하고 openAPI 가 검증. 양쪽 서비스가 같은 값을 알아야 함.
- 호출자가 헤더에 넣는 토큰: `x-open-user-token: <JWT>`
- payload 형식: `{ sub: <userId>, scope: ['read:calendar' | 'write:calendar', ...] }`. issuer-agnostic
  정책으로 `iss` 는 검증하지 않음 (다중 발급자 허용).
- 생성: `openssl rand -hex 32` (32바이트 이상 random hex 권장)

**로테이션 / 변경**
- 운영에서 PAT 또는 SIGNING_SECRET 을 바꾸면 호출자(MCP, aiFrontAPI) 도 동시에 갱신해야 함 — 무중단 교체가 필요하면 화이트리스트에 임시로 두 secret 을 모두 허용하는 단계가 필요(현 MVP 미지원, 단기 다운타임 감수).
- `.env.test.example` dummy 값(`deadbeef...`/`cafebabe...`) 은 절대 운영 secret 으로 쓰지 말 것.

#### OAuth 2.1 Authorization Server 시크릿 운영 정책 (`/v1/oauth/*`)

기능 스펙은 [`docs/spec/oauth.md`](docs/spec/oauth.md) 참조. 아래는 운영/시크릿 정책만.

5개 OAuth env 를 emulator 와 production 분리 운용 (emulator dummy 절대 재사용 금지):

- **`OAUTH_ISSUER`** — AS issuer. JWT `iss` claim + JWKS/metadata base URL. trailing slash 는 서버에서 정규화. production 은 hosting custom domain root, emulator 는 hosting emulator host-root URL (예: `http://127.0.0.1:5002`). functions emulator port 직접 (`/<project>/<region>/<function>`) 은 prefix 강제로 host-root path 함수 진입 불가 — hosting rewrite (`firebase.json`) 가 `.well-known/**` + `**` 둘 다 잡도록 구성되어야 RFC 8414 §3.1 host-root insert 흐름 동작 (issue #211).
- **`OAUTH_SIGNING_PRIVATE_KEY` / `OAUTH_SIGNING_PUBLIC_KEY`** — RS256 keypair (PKCS8 / SPKI PEM). access_token JWT 서명/검증. `kid` 는 public key 의 JWK thumbprint (RFC 7638) 로 자동 산출. 생성: `openssl genrsa 2048 > private.pem; openssl rsa -in private.pem -pubout > public.pem`. emulator dummy 는 `.env.test.example` 에 박혀 있으나 운영에서 절대 재사용 금지.
- **`OAUTH_CALENDAR_RESOURCE_URI`** — 보호 리소스 canonical URI 화이트리스트 (RFC 8707). 현재 단일 값.
- **`OAUTH_CONSENT_URL`** — Web consent UI base URL (`/authorize` 의 302 redirect 대상). error 페이지는 `<base>/error?reason=...`.

호스팅 / 운영 배포 절차는 이슈 #189 (특히 백로그 코멘트 #issuecomment-4426228666).
