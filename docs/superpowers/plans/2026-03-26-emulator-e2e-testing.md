# Emulator E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase 에뮬레이터 환경에서 전체 API 엔드포인트를 E2E 테스트하는 인프라를 구축한다.

**Architecture:** firebase.json에 functions/firestore/auth 에뮬레이터를 설정하고, index.js에 환경 분기를 추가한다. Mocha + assert + axios로 모든 라우트의 주요 엔드포인트를 검증하는 E2E 테스트를 작성한다. Claude Code 스킬로 반복 실행을 간소화한다.

**Tech Stack:** Firebase Emulator Suite, Mocha, assert (Node.js built-in), axios

**Spec:** `docs/superpowers/specs/2026-03-26-emulator-e2e-testing-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `functions/test/e2e/setup.js` | Global before: Auth 에뮬레이터 유저 생성, ID 토큰 발급, Firestore 초기화, 공통 시드 투입 |
| `functions/test/e2e/seeds/commonData.js` | 공통 시드 데이터 정의 및 Firestore에 write하는 함수 |
| `functions/test/e2e/helpers/request.js` | axios 래퍼: baseURL, auth 헤더 자동 세팅 |
| `functions/test/e2e/account.e2e.js` | Account 엔드포인트 E2E 테스트 |
| `functions/test/e2e/user.e2e.js` | User(notification) 엔드포인트 E2E 테스트 |
| `functions/test/e2e/todo.e2e.js` | Todo v1/v2 엔드포인트 E2E 테스트 |
| `functions/test/e2e/doneTodo.e2e.js` | DoneTodo v1/v2 엔드포인트 E2E 테스트 |
| `functions/test/e2e/schedule.e2e.js` | Schedule v1/v2 엔드포인트 E2E 테스트 |
| `functions/test/e2e/foremostEvent.e2e.js` | ForemostEvent 엔드포인트 E2E 테스트 |
| `functions/test/e2e/eventTag.e2e.js` | EventTag v1/v2 엔드포인트 E2E 테스트 |
| `functions/test/e2e/eventDetail.e2e.js` | EventDetail 엔드포인트 E2E 테스트 |
| `functions/test/e2e/migration.e2e.js` | Migration 엔드포인트 E2E 테스트 |
| `functions/test/e2e/setting.e2e.js` | Setting 엔드포인트 E2E 테스트 |
| `functions/test/e2e/holiday.e2e.js` | Holiday 엔드포인트 E2E 테스트 (비인증) |
| `functions/test/e2e/sync.e2e.js` | DataSync 엔드포인트 E2E 테스트 |
| `functions/.mocharc.e2e.yml` | E2E 전용 mocha 설정 |

### Modified Files
| File | Change |
|------|--------|
| `firebase.json` | functions, firestore 에뮬레이터 설정 추가 |
| `functions/index.js` | 에뮬레이터/프로덕션 조건부 초기화 분기 |
| `functions/package.json` | `emulator`, `test:e2e`, `test:e2e:run` 스크립트 추가 |
| `CLAUDE.md` | 에뮬레이터 커맨드 문서 추가 |

### Skill File
| File | Responsibility |
|------|---------------|
| `.claude/skills/emulator-test.md` | `/emulator-test` Claude Code 스킬 정의 |

---

## Task 1: Emulator Infrastructure Setup

**Files:**
- Modify: `firebase.json`
- Modify: `functions/index.js:1-19`
- Modify: `functions/package.json:4-11`

- [ ] **Step 1: Update firebase.json — add functions and firestore emulators**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "singleProjectMode": true
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ]
}
```

- [ ] **Step 2: Update index.js — conditional initialization**

Replace lines 10-18 of `functions/index.js`:

```js
// The firebase Admin SDK to access Firestore
const { initializeApp, applicationDefault, cert} = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
if (isEmulator) {
    initializeApp();
} else {
    const serviceAccount = require('./secrets/todocalendar-serviceAccountKey.json');
    require('dotenv').config({ path: './secrets/.env' });
    initializeApp({ credential: cert(serviceAccount) });
}
getFirestore().settings({ignoreUndefinedProperties: true});
```

- [ ] **Step 3: Add npm scripts to package.json**

Add to `functions/package.json` scripts:

```json
{
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log",
    "test": "mocha",
    "test:e2e": "mocha --config .mocharc.e2e.yml",
    "test:e2e:run": "cd .. && firebase emulators:exec \"cd functions && npm run test:e2e\"",
    "emulator": "cd .. && firebase emulators:start",
    "migrate-changelog": "node scripts/migrate_changelog.js"
  }
}
```

Note: `firebase` CLI 명령어는 `firebase.json`이 있는 프로젝트 루트에서 실행되어야 한다. `package.json`이 `functions/`에 있으므로 `emulator`와 `test:e2e:run` 스크립트는 `cd ..`으로 프로젝트 루트로 이동한 후 실행한다. `emulators:exec`의 내부 명령어는 프로젝트 루트에서 실행되므로 `cd functions &&`로 다시 `functions/`로 이동해야 mocha가 올바른 위치에서 실행된다.

- [ ] **Step 4: Verify emulator starts**

Run from `functions/`:
```bash
npm run emulator
```
Expected: Auth(9099), Functions(5001), Firestore(8080) 에뮬레이터가 시작되고, `index.js`가 `initializeApp()` (인자 없이)으로 초기화됨. 콘솔에 에뮬레이터 URL 출력.

에뮬레이터가 정상 시작되면 Ctrl+C로 종료.

- [ ] **Step 5: Commit**

```bash
git add firebase.json functions/index.js functions/package.json
git commit -m "[#97] 에뮬레이터 인프라 설정 (firebase.json, index.js 환경 분기, npm 스크립트)"
```

---

## Task 2: E2E Test Helpers (setup, request, seeds, mocharc)

**Files:**
- Create: `functions/test/e2e/setup.js`
- Create: `functions/test/e2e/helpers/request.js`
- Create: `functions/test/e2e/seeds/commonData.js`
- Create: `functions/.mocharc.e2e.yml`

- [ ] **Step 1: Create .mocharc.e2e.yml**

```yaml
spec: test/e2e/**/*.e2e.js
file: test/e2e/setup.js
timeout: 10000
```

- [ ] **Step 2: Create request.js helper**

`functions/test/e2e/helpers/request.js`:

```js
const axios = require('axios');

const PROJECT_ID = 'todocalendar-1707723626269';
const BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/api`;

let authToken = null;

function setAuthToken(token) {
    authToken = token;
}

function createClient(useAuth = true) {
    const headers = {};
    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return axios.create({
        baseURL: BASE_URL,
        headers,
        validateStatus: () => true  // don't throw on non-2xx
    });
}

function authedClient() {
    return createClient(true);
}

function publicClient() {
    return createClient(false);
}

module.exports = { setAuthToken, authedClient, publicClient, BASE_URL };
```

- [ ] **Step 3: Create commonData.js seed**

`functions/test/e2e/seeds/commonData.js`:

```js
const admin = require('firebase-admin');

const TEST_USER_UID = 'e2e-test-user-001';
const TEST_USER_EMAIL = 'e2e-test@example.com';

const defaultTagId = 'e2e-default-tag-001';

const commonSeeds = {
    eventTags: {
        [defaultTagId]: {
            name: 'E2E Test Tag',
            color_hex: '#FF0000'
        }
    }
};

async function seedCommonData() {
    const db = admin.firestore();
    const userId = TEST_USER_UID;

    // seed event tags
    for (const [tagId, tagData] of Object.entries(commonSeeds.eventTags)) {
        await db.collection('users').doc(userId)
            .collection('event_tags').doc(tagId)
            .set({ ...tagData, userId });
    }
}

async function clearFirestoreData() {
    const axios = require('axios');
    const projectId = 'todocalendar-1707723626269';
    try {
        await axios.delete(
            `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`
        );
    } catch (e) {
        console.warn('Failed to clear Firestore data:', e.message);
    }
}

module.exports = {
    TEST_USER_UID,
    TEST_USER_EMAIL,
    defaultTagId,
    commonSeeds,
    seedCommonData,
    clearFirestoreData
};
```

- [ ] **Step 4: Create setup.js (global before)**

`functions/test/e2e/setup.js`:

```js
// Set emulator environment variables BEFORE importing firebase-admin
// The test process (mocha) is separate from the emulated function process,
// so it needs its own firebase-admin initialization pointing at the emulators.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const admin = require('firebase-admin');
const axios = require('axios');
const { setAuthToken } = require('./helpers/request');
const { TEST_USER_UID, TEST_USER_EMAIL, seedCommonData, clearFirestoreData } = require('./seeds/commonData');

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const PROJECT_ID = 'todocalendar-1707723626269';

// Initialize firebase-admin for the test process (separate from the emulated function)
admin.initializeApp({ projectId: PROJECT_ID });

before(async function () {
    this.timeout(30000);

    // clear previous data (for manual emulator mode where data persists)
    await clearFirestoreData();

    // create test user in Auth emulator (ignore if already exists)
    try {
        await admin.auth().deleteUser(TEST_USER_UID);
    } catch (e) {
        // user doesn't exist yet, ignore
    }

    await admin.auth().createUser({
        uid: TEST_USER_UID,
        email: TEST_USER_EMAIL,
        password: 'test-password-123'
    });

    // get custom token -> exchange for ID token via Auth emulator REST API
    const customToken = await admin.auth().createCustomToken(TEST_USER_UID);
    const response = await axios.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
        { token: customToken, returnSecureToken: true }
    );
    const idToken = response.data.idToken;
    setAuthToken(idToken);

    // seed common data
    await seedCommonData();
});
```

- [ ] **Step 5: Run a smoke test to verify setup**

Create a minimal test file to verify the infrastructure works. Create `functions/test/e2e/smoke.e2e.js`:

```js
const assert = require('assert');
const { authedClient, publicClient } = require('./helpers/request');

describe('E2E Smoke Test', function () {
    it('should connect to emulator with auth', async function () {
        const client = authedClient();
        // hit any endpoint — holiday is simplest (no auth needed)
        const res = await publicClient().get('/v1/holiday', {
            params: { year: 2026, locale: 'ko_KR', code: 'KR' }
        });
        assert.strictEqual(res.status, 200);
    });

    it('should have valid auth token', async function () {
        const client = authedClient();
        // hit an auth-required endpoint
        const res = await client.get('/v1/tags/all');
        assert.strictEqual(res.status, 200);
    });
});
```

Run: `cd functions && npm run test:e2e:run` (from project root it will start emulator, run test, stop)

Expected: 2 tests pass.

- [ ] **Step 6: Delete smoke test, commit**

Delete `functions/test/e2e/smoke.e2e.js` after confirming it passes.

```bash
rm functions/test/e2e/smoke.e2e.js
git add functions/test/e2e/ functions/.mocharc.e2e.yml
git commit -m "[#97] E2E 테스트 인프라 (setup, request helper, seeds, mocharc)"
```

---

## Task 3: Account & User E2E Tests

**Files:**
- Create: `functions/test/e2e/account.e2e.js`
- Create: `functions/test/e2e/user.e2e.js`

- [ ] **Step 1: Write account.e2e.js**

`functions/test/e2e/account.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Account API', function () {
    describe('PUT /v1/accounts/info', function () {
        it('should create or update account info', async function () {
            const res = await authedClient().put('/v1/accounts/info');
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uid);
        });
    });

    describe('DELETE /v1/accounts/account', function () {
        it('should delete account', async function () {
            // first ensure account exists
            await authedClient().put('/v1/accounts/info');
            const res = await authedClient().delete('/v1/accounts/account');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
```

- [ ] **Step 2: Write user.e2e.js**

`functions/test/e2e/user.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('User API', function () {
    describe('PUT /v1/user/notification', function () {
        it('should register notification token', async function () {
            const res = await authedClient().put('/v1/user/notification',
                { fcm_token: 'test-fcm-token-123', device_model: 'iPhone' },
                { headers: { 'device_id': 'test-device-001' } }
            );
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });

        it('should fail without device_id header', async function () {
            const res = await authedClient().put('/v1/user/notification',
                { fcm_token: 'test-fcm-token-123' }
            );
            assert.strictEqual(res.status, 400);
        });
    });

    describe('DELETE /v1/user/notification', function () {
        it('should delete notification token', async function () {
            // register first
            await authedClient().put('/v1/user/notification',
                { fcm_token: 'test-fcm-token-123' },
                { headers: { 'device_id': 'test-device-001' } }
            );
            const res = await authedClient().delete('/v1/user/notification', {
                headers: { 'device_id': 'test-device-001' }
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All account and user tests pass.

- [ ] **Step 4: Commit**

```bash
git add functions/test/e2e/account.e2e.js functions/test/e2e/user.e2e.js
git commit -m "[#97] Account, User E2E 테스트 추가"
```

---

## Task 4: EventTag E2E Tests

**Files:**
- Create: `functions/test/e2e/eventTag.e2e.js`

- [ ] **Step 1: Write eventTag.e2e.js**

`functions/test/e2e/eventTag.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('EventTag API', function () {
    let createdTagId;

    describe('v1', function () {
        describe('POST /v1/tags/tag', function () {
            it('should create a tag', async function () {
                const res = await authedClient().post('/v1/tags/tag', {
                    name: 'Work',
                    color_hex: '#0000FF'
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
                assert.strictEqual(res.data.name, 'Work');
                createdTagId = res.data.uuid;
            });
        });

        describe('PUT /v1/tags/tag/:id', function () {
            it('should update a tag', async function () {
                const res = await authedClient().put(`/v1/tags/tag/${createdTagId}`, {
                    name: 'Work Updated',
                    color_hex: '#00FF00'
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Work Updated');
            });
        });

        describe('GET /v1/tags/all', function () {
            it('should return all tags', async function () {
                const res = await authedClient().get('/v1/tags/all');
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
                assert.ok(res.data.length > 0);
            });
        });

        describe('GET /v1/tags/', function () {
            it('should return tags by ids', async function () {
                const res = await authedClient().get('/v1/tags/', {
                    params: { ids: createdTagId }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
            });
        });

        describe('DELETE /v1/tags/tag/:id', function () {
            it('should delete a tag', async function () {
                const res = await authedClient().delete(`/v1/tags/tag/${createdTagId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        let v2TagId;

        before(async function () {
            const res = await authedClient().post('/v2/tags/tag', {
                name: 'V2 Tag',
                color_hex: '#FF00FF'
            });
            v2TagId = res.data.uuid;
        });

        describe('DELETE /v2/tags/tag_and_events/:id', function () {
            it('should delete tag and associated events', async function () {
                const res = await authedClient().delete(`/v2/tags/tag_and_events/${v2TagId}`);
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.todos !== undefined);
                assert.ok(res.data.schedules !== undefined);
            });
        });
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All eventTag tests pass.

- [ ] **Step 3: Commit**

```bash
git add functions/test/e2e/eventTag.e2e.js
git commit -m "[#97] EventTag E2E 테스트 추가 (v1/v2)"
```

---

## Task 5: Todo E2E Tests

**Files:**
- Create: `functions/test/e2e/todo.e2e.js`

- [ ] **Step 1: Write todo.e2e.js**

`functions/test/e2e/todo.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Todo API', function () {
    let createdTodoId;

    describe('v1', function () {
        describe('POST /v1/todos/todo', function () {
            it('should create a todo', async function () {
                const res = await authedClient().post('/v1/todos/todo', {
                    name: 'E2E Test Todo',
                    event_tag_id: 'e2e-default-tag-001',
                    event_time: {
                        time_type: 'at',
                        timestamp: Math.floor(Date.now() / 1000) + 86400
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
                assert.strictEqual(res.data.name, 'E2E Test Todo');
                createdTodoId = res.data.uuid;
            });

            it('should fail without name', async function () {
                const res = await authedClient().post('/v1/todos/todo', {});
                assert.strictEqual(res.status, 400);
            });
        });

        describe('GET /v1/todos/todo/:id', function () {
            it('should get a todo by id', async function () {
                const res = await authedClient().get(`/v1/todos/todo/${createdTodoId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.uuid, createdTodoId);
            });

            it('should return 404 for non-existent id', async function () {
                const res = await authedClient().get('/v1/todos/todo/non-existent-id');
                assert.strictEqual(res.status, 404);
            });
        });

        describe('GET /v1/todos/', function () {
            it('should return todos in time range', async function () {
                const now = Math.floor(Date.now() / 1000);
                const res = await authedClient().get('/v1/todos/', {
                    params: { lower: now, upper: now + 172800 }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
            });
        });

        describe('PUT /v1/todos/todo/:id', function () {
            it('should update a todo', async function () {
                const res = await authedClient().put(`/v1/todos/todo/${createdTodoId}`, {
                    name: 'Updated E2E Todo',
                    event_time: {
                        time_type: 'at',
                        timestamp: Math.floor(Date.now() / 1000) + 172800
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Updated E2E Todo');
            });
        });

        describe('PATCH /v1/todos/todo/:id', function () {
            it('should patch a todo', async function () {
                const res = await authedClient().patch(`/v1/todos/todo/${createdTodoId}`, {
                    name: 'Patched E2E Todo'
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Patched E2E Todo');
            });
        });

        describe('POST /v1/todos/todo/:id/complete', function () {
            it('should complete a todo', async function () {
                const res = await authedClient().post(`/v1/todos/todo/${createdTodoId}/complete`, {
                    origin: { name: 'Patched E2E Todo' }
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
            });
        });

        describe('DELETE /v1/todos/todo/:id', function () {
            it('should delete a todo', async function () {
                // create a new todo to delete
                const createRes = await authedClient().post('/v1/todos/todo', {
                    name: 'Todo to Delete'
                });
                const res = await authedClient().delete(`/v1/todos/todo/${createRes.data.uuid}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        it('should create a todo via v2', async function () {
            const res = await authedClient().post('/v2/todos/todo', {
                name: 'V2 Todo'
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uuid);
        });
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All todo tests pass.

- [ ] **Step 3: Commit**

```bash
git add functions/test/e2e/todo.e2e.js
git commit -m "[#97] Todo E2E 테스트 추가 (v1/v2)"
```

---

## Task 6: DoneTodo E2E Tests

**Files:**
- Create: `functions/test/e2e/doneTodo.e2e.js`

- [ ] **Step 1: Write doneTodo.e2e.js**

`functions/test/e2e/doneTodo.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('DoneTodo API', function () {
    let doneTodoId;
    let originalTodoId;

    before(async function () {
        // create and complete a todo to get a doneTodo
        const todoRes = await authedClient().post('/v1/todos/todo', {
            name: 'Todo to Complete for DoneTodo Test',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        originalTodoId = todoRes.data.uuid;

        const doneRes = await authedClient().post(`/v1/todos/todo/${originalTodoId}/complete`, {
            origin: todoRes.data
        });
        doneTodoId = doneRes.data.uuid;
    });

    describe('v1', function () {
        describe('GET /v1/todos/dones/', function () {
            it('should return paginated done todos', async function () {
                const res = await authedClient().get('/v1/todos/dones/', {
                    params: { size: 10 }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.contents !== undefined || Array.isArray(res.data));
            });
        });

        describe('GET /v1/todos/dones/:id', function () {
            it('should get a done todo by id', async function () {
                const res = await authedClient().get(`/v1/todos/dones/${doneTodoId}`);
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.uuid);
            });
        });

        describe('PUT /v1/todos/dones/:id', function () {
            it('should update a done todo', async function () {
                const res = await authedClient().put(`/v1/todos/dones/${doneTodoId}`, {
                    name: 'Updated Done Todo'
                });
                assert.strictEqual(res.status, 200);
            });
        });

        describe('POST /v1/todos/dones/:id/revert', function () {
            it('should revert a done todo back to active', async function () {
                // create and complete another todo for this test
                const todoRes = await authedClient().post('/v1/todos/todo', {
                    name: 'Todo for Revert Test'
                });
                const doneRes = await authedClient().post(`/v1/todos/todo/${todoRes.data.uuid}/complete`, {
                    origin: todoRes.data
                });
                const res = await authedClient().post(`/v1/todos/dones/${doneRes.data.uuid}/revert`);
                assert.strictEqual(res.status, 201);
            });
        });

        describe('DELETE /v1/todos/dones/:id', function () {
            it('should delete a done todo', async function () {
                // create and complete another todo for this test
                const todoRes = await authedClient().post('/v1/todos/todo', {
                    name: 'Todo for Delete Done Test'
                });
                const doneRes = await authedClient().post(`/v1/todos/todo/${todoRes.data.uuid}/complete`, {
                    origin: todoRes.data
                });
                const res = await authedClient().delete(`/v1/todos/dones/${doneRes.data.uuid}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        describe('POST /v2/todos/dones/:id/revert', function () {
            it('should revert via v2 endpoint', async function () {
                const todoRes = await authedClient().post('/v2/todos/todo', {
                    name: 'V2 Revert Test Todo'
                });
                const doneRes = await authedClient().post(`/v2/todos/todo/${todoRes.data.uuid}/complete`, {
                    origin: todoRes.data
                });
                const res = await authedClient().post(`/v2/todos/dones/${doneRes.data.uuid}/revert`);
                assert.strictEqual(res.status, 201);
            });
        });
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All doneTodo tests pass.

- [ ] **Step 3: Commit**

```bash
git add functions/test/e2e/doneTodo.e2e.js
git commit -m "[#97] DoneTodo E2E 테스트 추가 (v1/v2)"
```

---

## Task 7: Schedule E2E Tests

**Files:**
- Create: `functions/test/e2e/schedule.e2e.js`

- [ ] **Step 1: Write schedule.e2e.js**

`functions/test/e2e/schedule.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Schedule API', function () {
    let createdScheduleId;
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

    describe('v1', function () {
        describe('POST /v1/schedules/schedule', function () {
            it('should create a schedule', async function () {
                const res = await authedClient().post('/v1/schedules/schedule', {
                    name: 'E2E Test Schedule',
                    event_time: {
                        time_type: 'period',
                        period_start: futureTimestamp,
                        period_end: futureTimestamp + 3600
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
                assert.strictEqual(res.data.name, 'E2E Test Schedule');
                createdScheduleId = res.data.uuid;
            });

            it('should fail without name', async function () {
                const res = await authedClient().post('/v1/schedules/schedule', {
                    event_time: { time_type: 'at', timestamp: futureTimestamp }
                });
                assert.strictEqual(res.status, 400);
            });
        });

        describe('GET /v1/schedules/schedule/:id', function () {
            it('should get a schedule by id', async function () {
                const res = await authedClient().get(`/v1/schedules/schedule/${createdScheduleId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.uuid, createdScheduleId);
            });
        });

        describe('GET /v1/schedules/', function () {
            it('should return schedules in time range', async function () {
                const now = Math.floor(Date.now() / 1000);
                const res = await authedClient().get('/v1/schedules/', {
                    params: { lower: now, upper: now + 172800 }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
            });
        });

        describe('PUT /v1/schedules/schedule/:id', function () {
            it('should update a schedule', async function () {
                const res = await authedClient().put(`/v1/schedules/schedule/${createdScheduleId}`, {
                    name: 'Updated E2E Schedule',
                    event_time: {
                        time_type: 'period',
                        period_start: futureTimestamp,
                        period_end: futureTimestamp + 7200
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Updated E2E Schedule');
            });
        });

        describe('PATCH /v1/schedules/schedule/:id', function () {
            it('should patch a schedule', async function () {
                const res = await authedClient().patch(`/v1/schedules/schedule/${createdScheduleId}`, {
                    name: 'Patched Schedule'
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Patched Schedule');
            });
        });

        describe('DELETE /v1/schedules/schedule/:id', function () {
            it('should delete a schedule', async function () {
                const res = await authedClient().delete(`/v1/schedules/schedule/${createdScheduleId}`);
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        it('should create a schedule via v2', async function () {
            const res = await authedClient().post('/v2/schedules/schedule', {
                name: 'V2 Schedule',
                event_time: {
                    time_type: 'at',
                    timestamp: futureTimestamp
                }
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uuid);
        });
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All schedule tests pass.

- [ ] **Step 3: Commit**

```bash
git add functions/test/e2e/schedule.e2e.js
git commit -m "[#97] Schedule E2E 테스트 추가 (v1/v2)"
```

---

## Task 8: ForemostEvent & EventDetail E2E Tests

**Files:**
- Create: `functions/test/e2e/foremostEvent.e2e.js`
- Create: `functions/test/e2e/eventDetail.e2e.js`

- [ ] **Step 1: Write foremostEvent.e2e.js**

`functions/test/e2e/foremostEvent.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('ForemostEvent API', function () {
    let todoId;

    before(async function () {
        const res = await authedClient().post('/v1/todos/todo', {
            name: 'Todo for Foremost Test',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
        });
        todoId = res.data.uuid;
    });

    describe('PUT /v1/foremost/event', function () {
        it('should set foremost event', async function () {
            const res = await authedClient().put('/v1/foremost/event', {
                event_id: todoId,
                is_todo: true
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.event_id, todoId);
        });

        it('should fail without event_id', async function () {
            const res = await authedClient().put('/v1/foremost/event', {});
            assert.strictEqual(res.status, 400);
        });
    });

    describe('GET /v1/foremost/event', function () {
        it('should get foremost event', async function () {
            const res = await authedClient().get('/v1/foremost/event');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.event_id, todoId);
        });
    });

    describe('DELETE /v1/foremost/event', function () {
        it('should clear foremost event', async function () {
            const res = await authedClient().delete('/v1/foremost/event');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
```

- [ ] **Step 2: Write eventDetail.e2e.js**

`functions/test/e2e/eventDetail.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('EventDetail API', function () {
    let todoId;
    let doneTodoId;

    before(async function () {
        // create a todo for event detail tests
        const todoRes = await authedClient().post('/v1/todos/todo', {
            name: 'Todo for Detail Test',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
        });
        todoId = todoRes.data.uuid;

        // create a done todo
        const todo2Res = await authedClient().post('/v1/todos/todo', {
            name: 'Todo for Done Detail Test'
        });
        const doneRes = await authedClient().post(`/v1/todos/todo/${todo2Res.data.uuid}/complete`, {
            origin: todo2Res.data
        });
        doneTodoId = doneRes.data.uuid;
    });

    describe('Active event details', function () {
        describe('PUT /v1/event_details/:id', function () {
            it('should create/update event detail', async function () {
                const res = await authedClient().put(`/v1/event_details/${todoId}`, {
                    place: 'Office',
                    url: 'https://example.com',
                    memo: 'Test memo'
                });
                assert.strictEqual(res.status, 201);
            });
        });

        describe('GET /v1/event_details/:id', function () {
            it('should get event detail', async function () {
                const res = await authedClient().get(`/v1/event_details/${todoId}`);
                assert.strictEqual(res.status, 200);
            });
        });

        describe('DELETE /v1/event_details/:id', function () {
            it('should delete event detail', async function () {
                const res = await authedClient().delete(`/v1/event_details/${todoId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('Done event details', function () {
        describe('PUT /v1/event_details/done/:id', function () {
            it('should create/update done event detail', async function () {
                const res = await authedClient().put(`/v1/event_details/done/${doneTodoId}`, {
                    memo: 'Done todo memo'
                });
                assert.strictEqual(res.status, 201);
            });
        });

        describe('GET /v1/event_details/done/:id', function () {
            it('should get done event detail', async function () {
                const res = await authedClient().get(`/v1/event_details/done/${doneTodoId}`);
                assert.strictEqual(res.status, 200);
            });
        });

        describe('DELETE /v1/event_details/done/:id', function () {
            it('should delete done event detail', async function () {
                const res = await authedClient().delete(`/v1/event_details/done/${doneTodoId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All foremostEvent and eventDetail tests pass.

- [ ] **Step 4: Commit**

```bash
git add functions/test/e2e/foremostEvent.e2e.js functions/test/e2e/eventDetail.e2e.js
git commit -m "[#97] ForemostEvent, EventDetail E2E 테스트 추가"
```

---

## Task 9: Migration & Setting E2E Tests

**Files:**
- Create: `functions/test/e2e/migration.e2e.js`
- Create: `functions/test/e2e/setting.e2e.js`

- [ ] **Step 1: Write migration.e2e.js**

`functions/test/e2e/migration.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Migration API', function () {
    describe('POST /v1/migration/event_tags', function () {
        it('should migrate event tags', async function () {
            const res = await authedClient().post('/v1/migration/event_tags', {
                'migrate-tag-001': { name: 'Migrated Tag', color_hex: '#AABBCC' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/todos', function () {
        it('should migrate todos', async function () {
            const res = await authedClient().post('/v1/migration/todos', {
                'migrate-todo-001': {
                    name: 'Migrated Todo',
                    event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
                }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/schedules', function () {
        it('should migrate schedules', async function () {
            const res = await authedClient().post('/v1/migration/schedules', {
                'migrate-schedule-001': {
                    name: 'Migrated Schedule',
                    event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
                }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/event_details', function () {
        it('should migrate event details', async function () {
            const res = await authedClient().post('/v1/migration/event_details', {
                'migrate-todo-001': { memo: 'migrated memo', place: 'Seoul' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/todos/done', function () {
        it('should migrate done todos', async function () {
            const res = await authedClient().post('/v1/migration/todos/done', {
                'migrate-done-001': {
                    name: 'Migrated Done Todo',
                    done_at: Math.floor(Date.now() / 1000)
                }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/todos/done/details', function () {
        it('should migrate done todo details', async function () {
            const res = await authedClient().post('/v1/migration/todos/done/details', {
                'migrate-done-001': { memo: 'done memo' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
```

- [ ] **Step 2: Write setting.e2e.js**

`functions/test/e2e/setting.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Setting API', function () {
    describe('PATCH /v1/setting/event/tag/default/color', function () {
        it('should update default tag colors', async function () {
            const res = await authedClient().patch('/v1/setting/event/tag/default/color', {
                holiday: '#FF0000',
                default: '#0000FF'
            });
            assert.strictEqual(res.status, 201);
        });
    });

    describe('GET /v1/setting/event/tag/default/color', function () {
        it('should get default tag colors', async function () {
            const res = await authedClient().get('/v1/setting/event/tag/default/color');
            assert.strictEqual(res.status, 200);
        });
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All migration and setting tests pass.

- [ ] **Step 4: Commit**

```bash
git add functions/test/e2e/migration.e2e.js functions/test/e2e/setting.e2e.js
git commit -m "[#97] Migration, Setting E2E 테스트 추가"
```

---

## Task 10: Holiday & Sync E2E Tests

**Files:**
- Create: `functions/test/e2e/holiday.e2e.js`
- Create: `functions/test/e2e/sync.e2e.js`

- [ ] **Step 1: Write holiday.e2e.js**

`functions/test/e2e/holiday.e2e.js`:

```js
const assert = require('assert');
const { publicClient, authedClient } = require('./helpers/request');

describe('Holiday API', function () {
    describe('GET /v1/holiday/', function () {
        it('should return holidays without auth', async function () {
            const res = await publicClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'ko_KR', code: 'KR' }
            });
            assert.strictEqual(res.status, 200);
            assert.ok(res.data);
        });

        it('should fail without required params', async function () {
            const res = await publicClient().get('/v1/holiday/');
            assert.strictEqual(res.status, 400);
        });

        it('should also work with auth header', async function () {
            const res = await authedClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'en_US', code: 'US' }
            });
            assert.strictEqual(res.status, 200);
        });
    });
});
```

- [ ] **Step 2: Write sync.e2e.js**

`functions/test/e2e/sync.e2e.js`:

```js
const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('DataSync API', function () {

    before(async function () {
        // create some data to have change logs
        await authedClient().post('/v1/tags/tag', {
            name: 'Sync Test Tag',
            color_hex: '#112233'
        });
        await authedClient().post('/v1/todos/todo', {
            name: 'Sync Test Todo'
        });
    });

    describe('GET /v1/sync/check', function () {
        it('should check sync status for EventTag', async function () {
            const res = await authedClient().get('/v1/sync/check', {
                params: { dataType: 'EventTag' }
            });
            assert.strictEqual(res.status, 200);
        });

        it('should check sync status for Todo', async function () {
            const res = await authedClient().get('/v1/sync/check', {
                params: { dataType: 'Todo' }
            });
            assert.strictEqual(res.status, 200);
        });

        it('should fail with invalid dataType', async function () {
            const res = await authedClient().get('/v1/sync/check', {
                params: { dataType: 'Invalid' }
            });
            assert.ok(res.status >= 400);
        });
    });

    describe('GET /v1/sync/start', function () {
        it('should start sync with pagination', async function () {
            const res = await authedClient().get('/v1/sync/start', {
                params: { dataType: 'EventTag', size: 10 }
            });
            assert.strictEqual(res.status, 200);
        });
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd functions && npm run test:e2e:run`
Expected: All holiday and sync tests pass.

- [ ] **Step 4: Commit**

```bash
git add functions/test/e2e/holiday.e2e.js functions/test/e2e/sync.e2e.js
git commit -m "[#97] Holiday, DataSync E2E 테스트 추가"
```

---

## Task 11: CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add emulator commands to CLAUDE.md**

Add after the existing commands block in `CLAUDE.md` (after the `npm run migrate-changelog` line):

```markdown
# Emulator E2E Testing
npm run emulator          # Start emulators for manual testing (Auth:9099, Functions:5001, Firestore:8080)
npm run test:e2e          # Run E2E tests (requires emulator already running)
npm run test:e2e:run      # One-command: start emulators → run E2E tests → stop emulators
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "[#97] CLAUDE.md에 에뮬레이터 E2E 테스트 커맨드 추가"
```

---

## Task 12: Claude Code Skill (`/emulator-test`)

**Files:**
- Create: `.claude/skills/emulator-test.md`

- [ ] **Step 1: Create the skill file**

`.claude/skills/emulator-test.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/emulator-test.md
git commit -m "[#97] Claude Code /emulator-test 스킬 추가"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run full E2E suite**

```bash
cd functions && npm run test:e2e:run
```

Expected: All tests pass. Note the total count and time.

- [ ] **Step 2: Verify existing unit tests still pass**

```bash
cd functions && npm test
```

Expected: All existing unit tests pass (no regressions from index.js change).

- [ ] **Step 3: Verify emulator manual mode**

```bash
cd functions && npm run emulator
```

In another terminal:
```bash
cd functions && npm run test:e2e
```

Expected: Tests pass against manually started emulator. Stop emulator with Ctrl+C.

- [ ] **Step 4: Final commit if any fixes needed**

If any adjustments were made during verification, commit them.
