# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

This is a **Firebase Cloud Functions** backend (Node.js 20) serving a Todo/Calendar app. The single exported function `exports.api` in `functions/index.js` is an Express app mounted as an HTTPS handler.

### Layer Structure

```
routes/ → controllers/ → services/ → repositories/
```

- **Routes** (`routes/`): Express routers that also act as **composition roots** — they instantiate and wire together all dependencies (repositories, services, controllers) via constructor injection. There is no DI container.
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

### Testing

Tests use **Mocha + assert** (Node.js built-in). Test doubles live in `test/doubles/`:
- `stubRepositories.js`: Stub implementations for all repositories with `shouldFail*` flags to trigger failure paths. Stubs return model instances (e.g., `TodoModel.fromData()`).
- `spyChangeLogRecordService.js`: Spy that records logged data types and change logs for assertion

Tests are organized in `test/services/`, `test/controllers/`, and `test/models/`. Service tests pass stubs via constructor injection. Controller tests use `stubServices.js` (plain objects, independent of repository model changes).

### Secrets

`functions/secrets/` contains `todocalendar-serviceAccountKey.json` and `.env`. These files are not committed and must be present locally to run the app.
