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

### Key Cross-Cutting Services

- **`EventTimeRangeService`** (`services/eventTimeRangeService.js`): Maintains a separate time-range index for every event (todo or schedule). Every create/update/delete must call this service to keep the index in sync. Supports `at`, `period`, and `allday` time types.
- **`DataChangeLogRecordService`** (`services/dataChangeLogRecordService.js`): Records a `DataChangeLog` (CREATED/UPDATED/DELETED) and updates the sync timestamp on every mutation. Called by all mutating services.
- **`DataSyncService`** (`services/dataSyncService.js`): Provides incremental sync via change logs. Clients send their last known timestamp; the server returns pages of changed items.
- **`EventDetailDataService`** (`services/eventDetailService.js`): Wraps two `EventDetailDataRepository` instances — one for active events (`isDone=false`) and one for done todos (`isDone=true`).

### Auth

`middlewares/authMiddleware.js` verifies Firebase ID tokens from the `Authorization: Bearer <token>` header and attaches the decoded token to `req.auth`. Applied to all routes except `/v1/accounts` and `/v1/holiday`.

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
├── setup.js              # global before: 유저 생성, 토큰 발급, Firestore 초기화
├── seeds/commonData.js   # 공통 시드 데이터
├── helpers/request.js    # axios 래퍼 (baseURL, auth 헤더 자동 세팅)
└── *.e2e.js              # 라우트별 E2E 테스트 (12개)
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
- `.env`: 프로덕션 환경변수 (`HOLIDAY_API_KEY`, `OPENAPI_PAT_MCP`, `SIGNING_SECRET` 등)
- `.env.test`: 에뮬레이터/E2E 전용 환경변수. 프로덕션 `.env` 와 **값이 절대 같지 않게** dummy/random 으로 운용 (보안 분리). 에뮬레이터 모드에서 `index.js` 가 자동 로드. 누락 시 dotenv silent fail (CI 등은 직접 `process.env` 주입 가능)
- `.env.test.example`: `.env.test` 템플릿. 새 시크릿 키 추가 시 같이 갱신.
