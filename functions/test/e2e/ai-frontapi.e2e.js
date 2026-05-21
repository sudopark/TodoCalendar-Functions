'use strict';

const assert = require('assert');
const axios = require('axios');
const admin = require('firebase-admin');

const { authedClient } = require('./helpers/request');
const { BASE_URL } = require('./helpers/request');

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const PROJECT_ID = 'todocalendar-1707723626269';

// ──────────────────────────────────────────────────────────────────────────
// pollJob — terminal 상태(DONE/CONFIRM/FAILED)가 될 때까지 GET 반복
// ──────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────
// second user — Auth emulator 에서 발급
// ──────────────────────────────────────────────────────────────────────────
const SECOND_USER_UID = 'e2e-test-user-002';
const SECOND_USER_EMAIL = 'e2e-test2@example.com';

async function createSecondUserClient() {
    try {
        await admin.auth().deleteUser(SECOND_USER_UID);
    } catch (_) {
        // 없으면 무시
    }
    await admin.auth().createUser({
        uid: SECOND_USER_UID,
        email: SECOND_USER_EMAIL,
        password: 'test-password-456'
    });
    const customToken = await admin.auth().createCustomToken(SECOND_USER_UID);
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

// ──────────────────────────────────────────────────────────────────────────
describe('aiFrontAPI /v1/ai', function () {

    let client;
    let secondClient;

    before(async function () {
        this.timeout(15000);
        client = authedClient();
        secondClient = await createSecondUserClient();
    });

    // ────────────────────────────────────────────────────────────────────
    describe('POST /v1/ai/command', function () {

        it('device_id 헤더 누락 → 400', async function () {
            const res = await client.post('/v1/ai/command', { command_text: 'hello', timezone: 'Asia/Seoul' });
            assert.strictEqual(res.status, 400);
        });

        it('timezone 누락 → 400', async function () {
            const res = await client.post(
                '/v1/ai/command',
                { command_text: 'hello' },
                { headers: { device_id: 'e2e-device-001' } }
            );
            assert.strictEqual(res.status, 400);
        });

        it('유효하지 않은 timezone → 400', async function () {
            const res = await client.post(
                '/v1/ai/command',
                { command_text: 'hello', timezone: 'Not/ATimezone' },
                { headers: { device_id: 'e2e-device-001' } }
            );
            assert.strictEqual(res.status, 400);
        });

        it('DONE 골든 패스 — 202 → 폴링 → status DONE + result.type DONE', async function () {
            this.timeout(10000);
            const res = await client.post(
                '/v1/ai/command',
                { command_text: 'plain text', timezone: 'Asia/Seoul' },
                { headers: { device_id: 'e2e-device-001' } }
            );
            assert.strictEqual(res.status, 202);
            assert.ok(res.data.job_id, 'job_id 가 응답에 있어야 함');

            const job = await pollJob(client, res.data.job_id);
            assert.strictEqual(job.status, 'DONE');
            assert.strictEqual(job.result.type, 'DONE');
        });

        it('CONFIRM — command_text 에 [stub:CONFIRM] 포함 → 폴링 → status CONFIRM + result.action 존재', async function () {
            this.timeout(10000);
            const res = await client.post(
                '/v1/ai/command',
                { command_text: '[stub:CONFIRM] do something', timezone: 'Asia/Seoul' },
                { headers: { device_id: 'e2e-device-001' } }
            );
            assert.strictEqual(res.status, 202);

            const job = await pollJob(client, res.data.job_id);
            assert.strictEqual(job.status, 'CONFIRM');
            assert.ok(job.result.action, 'result.action 이 존재해야 함');
        });

        it('FAILED — command_text 에 [stub:FAILED] 포함 → 폴링 → status FAILED + result.reason 존재', async function () {
            this.timeout(10000);
            const res = await client.post(
                '/v1/ai/command',
                { command_text: '[stub:FAILED] bad command', timezone: 'Asia/Seoul' },
                { headers: { device_id: 'e2e-device-001' } }
            );
            assert.strictEqual(res.status, 202);

            const job = await pollJob(client, res.data.job_id);
            assert.strictEqual(job.status, 'FAILED');
            assert.ok(job.result.reason, 'result.reason 이 존재해야 함');
        });
    });

    // ────────────────────────────────────────────────────────────────────
    describe('GET /v1/ai/jobs/:id', function () {

        it('타인 접근 — userA job 을 userB 토큰으로 조회 → 403', async function () {
            this.timeout(10000);
            // userA(기본 테스트 유저)가 job 생성
            const postRes = await client.post(
                '/v1/ai/command',
                { command_text: 'test job for auth check', timezone: 'Asia/Seoul' },
                { headers: { device_id: 'e2e-device-001' } }
            );
            assert.strictEqual(postRes.status, 202);
            const jobId = postRes.data.job_id;

            // userB 토큰으로 조회
            const getRes = await secondClient.get(`/v1/ai/jobs/${jobId}`);
            assert.strictEqual(getRes.status, 403);
        });
    });
});
