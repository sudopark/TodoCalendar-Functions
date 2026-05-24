'use strict';

const assert = require('assert');
const axios = require('axios');
const admin = require('firebase-admin');

const { BASE_URL } = require('./helpers/request');

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const PROJECT_ID = 'todocalendar-1707723626269';

// 본 시나리오 전용 user — ai-frontapi.e2e.js 등 다른 e2e 가 건드린 ai_jobs / aiUsage
// 누적 데이터와 격리되도록 별도 uid 사용. before 훅에서 매번 새로 생성.
const USAGE_USER_UID = 'e2e-test-user-usage';
const USAGE_USER_EMAIL = 'e2e-test-usage@example.com';

// 사용량이 전혀 없는 user — 빈 응답 시나리오 전용.
const EMPTY_USER_UID = 'e2e-test-user-empty';
const EMPTY_USER_EMAIL = 'e2e-test-empty@example.com';

// FakeAnthropicClient (markerFallback) 의 markerless 응답이 1턴 DONE finalize,
// usage = { input_tokens: 10, output_tokens: 10 }. 호출당 input=10, output=10 누적.
const PER_CALL_INPUT_TOKENS = 10;
const PER_CALL_OUTPUT_TOKENS = 10;

async function createAuthedClient(uid, email) {
    try {
        await admin.auth().deleteUser(uid);
    } catch (_) { /* ignore */ }
    await admin.auth().createUser({ uid, email, password: 'test-password-usage' });
    const customToken = await admin.auth().createCustomToken(uid);
    const response = await axios.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
        { token: customToken, returnSecureToken: true }
    );
    const idToken = response.data.idToken;
    return axios.create({
        baseURL: BASE_URL,
        headers: { Authorization: `Bearer ${idToken}` },
        validateStatus: () => true
    });
}

async function pollJob(client, jobId, { timeoutMs = 5000, intervalMs = 100 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const res = await client.get(`/v1/ai/jobs/${jobId}`);
        if (res.status === 200 && ['DONE', 'CONFIRM', 'FAILED'].includes(res.data.status)) {
            return res.data;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`pollJob timeout (${timeoutMs}ms) — jobId: ${jobId}`);
}

function todayUtcKey() {
    return new Date().toISOString().slice(0, 10);
}

async function deleteUsageDoc(uid, dateKey) {
    const ref = admin.firestore().collection('aiUsage').doc(uid).collection('dailyUsage').doc(dateKey);
    await ref.delete();
}

async function readUsageDoc(uid, dateKey) {
    const snap = await admin.firestore().collection('aiUsage').doc(uid).collection('dailyUsage').doc(dateKey).get();
    return snap.exists ? snap.data() : null;
}

async function postCommand(client, commandText = 'plain text') {
    const res = await client.post(
        '/v1/ai/command',
        { command_text: commandText, timezone: 'Asia/Seoul' },
        { headers: { device_id: 'e2e-device-usage' } }
    );
    assert.strictEqual(res.status, 202, `command 응답 202 — actual ${res.status} body ${JSON.stringify(res.data)}`);
    return res.data.job_id;
}

// ──────────────────────────────────────────────────────────────────────────
describe('aiUsage /v1/ai/usage', function () {

    let usageClient;
    let emptyClient;

    before(async function () {
        this.timeout(15000);
        usageClient = await createAuthedClient(USAGE_USER_UID, USAGE_USER_EMAIL);
        emptyClient = await createAuthedClient(EMPTY_USER_UID, EMPTY_USER_EMAIL);
        // 본 시나리오 전용 user 의 오늘 doc 초기화 (이전 emulator run 잔여 제거)
        await deleteUsageDoc(USAGE_USER_UID, todayUtcKey());
        await deleteUsageDoc(EMPTY_USER_UID, todayUtcKey());
    });

    it('DONE 골든 command 1회 → Firestore aiUsage/{uid}/dailyUsage/{UTC-today} doc 에 input/output 토큰 누적', async function () {
        this.timeout(10000);
        const dateKey = todayUtcKey();

        const jobId = await postCommand(usageClient);
        const job = await pollJob(usageClient, jobId);
        assert.strictEqual(job.status, 'DONE');

        const doc = await readUsageDoc(USAGE_USER_UID, dateKey);
        assert.ok(doc, `aiUsage doc 존재 (dateKey=${dateKey})`);
        assert.strictEqual(doc.input_tokens, PER_CALL_INPUT_TOKENS);
        assert.strictEqual(doc.output_tokens, PER_CALL_OUTPUT_TOKENS);
        assert.ok(doc.updated_at, 'updated_at 채워짐');
    });

    it('같은 user 가 두 번째 command 발행 → 같은 dateKey doc 에 토큰 값이 합산됨 (atomic increment)', async function () {
        this.timeout(10000);
        const dateKey = todayUtcKey();

        // 직전 케이스에서 이미 1회 누적된 상태 — 두 번째 command 후 doc 값이 2배여야 함.
        const jobId = await postCommand(usageClient);
        const job = await pollJob(usageClient, jobId);
        assert.strictEqual(job.status, 'DONE');

        const doc = await readUsageDoc(USAGE_USER_UID, dateKey);
        assert.strictEqual(doc.input_tokens, PER_CALL_INPUT_TOKENS * 2);
        assert.strictEqual(doc.output_tokens, PER_CALL_OUTPUT_TOKENS * 2);
    });

    it('GET /v1/ai/usage — 누적된 사용자가 조회 → 200 + 누적 token / today dateKey 응답', async function () {
        const dateKey = todayUtcKey();
        const res = await usageClient.get('/v1/ai/usage');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.date, dateKey);
        assert.strictEqual(res.data.input_tokens, PER_CALL_INPUT_TOKENS * 2);
        assert.strictEqual(res.data.output_tokens, PER_CALL_OUTPUT_TOKENS * 2);
        assert.ok(res.data.updated_at, 'updated_at 응답');
    });

    it('GET /v1/ai/usage — 사용량 doc 없는 user 조회 → 200 + 0/0/null 빈 응답 (균일 shape)', async function () {
        const dateKey = todayUtcKey();
        const res = await emptyClient.get('/v1/ai/usage');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.date, dateKey);
        assert.strictEqual(res.data.input_tokens, 0);
        assert.strictEqual(res.data.output_tokens, 0);
        assert.strictEqual(res.data.updated_at, null);
    });
});
