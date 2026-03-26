---
name: emulator-test
description: Run Firebase Emulator E2E tests — full suite, specific module, or changed-files-only
user_invocable: true
---

# Emulator E2E Test Runner

Run E2E tests against Firebase Emulator. All commands run from the `functions/` directory.

## Arguments

- No args: run all E2E tests
- `<module>`: run tests for a specific module (e.g., `todo`, `schedule`, `eventTag`)
- `--changed`: detect changed files and run only related E2E tests

## Process

### 1. Check emulator status

```bash
lsof -i :5001 -sTCP:LISTEN
```

- If port 5001 is **in use**: emulator is running, use `npm run test:e2e` directly
- If port 5001 is **not in use**: use `npm run test:e2e:run` (starts emulator, runs tests, stops)

### 2. Determine test scope

**No args (full suite):**
```bash
cd functions && npm run test:e2e
# or
cd functions && npm run test:e2e:run
```

**Specific module:**
```bash
cd functions && npx mocha --config .mocharc.e2e.yml test/e2e/<module>.e2e.js
```

Module name mapping:
| Argument | Test file |
|----------|-----------|
| account | account.e2e.js |
| user | user.e2e.js |
| todo | todo.e2e.js |
| doneTodo | doneTodo.e2e.js |
| schedule | schedule.e2e.js |
| foremost | foremostEvent.e2e.js |
| tag, eventTag | eventTag.e2e.js |
| detail, eventDetail | eventDetail.e2e.js |
| migration | migration.e2e.js |
| setting | setting.e2e.js |
| holiday | holiday.e2e.js |
| sync | sync.e2e.js |

**--changed flag:**
1. Run `git diff --name-only HEAD` to get changed files
2. Map changed files to related E2E test files:
   - `routes/todoRoutes.js` or `controllers/todoController.js` or `services/todoService.js` → `todo.e2e.js`
   - `routes/schedulesRoutes.js` or `controllers/scheduleController.js` or `services/scheduleService.js` → `schedule.e2e.js`
   - Pattern: match route/controller/service name prefix to the corresponding `.e2e.js` file
   - `models/` changes → run all E2E tests (models are shared)
   - `index.js` or `middlewares/` changes → run all E2E tests
3. Run only the mapped test files

### 3. Run and report

Run the determined test command. After completion:

- Parse mocha output for passing/failing counts
- If all pass: report summary (e.g., "12 passing")
- If failures: show each failing test name, the assertion error, and suggest likely cause/fix based on the error message and the test code

### 4. Important notes

- The `setup.js` file (global before hook) runs automatically via `.mocharc.e2e.yml` `file` option — it handles auth token setup and Firestore clearing
- If emulator crashes or tests hang, check if another emulator process is already running: `lsof -i :5001 -i :8080 -i :9099`
- E2E tests require the `firebase` CLI to be installed globally
