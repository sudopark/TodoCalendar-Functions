'use strict';

const assert = require('assert');

const { authedClient } = require('./helpers/request');
const { signUserToken, openClient, defaultMcpPat } = require('./helpers/openClient');
const { TEST_USER_UID } = require('./seeds/commonData');

// 1차 [stub:CONFIRM:<id>] → CONFIRM → reject endpoint → REJECTED 흐름 검증 (#243).
// confirm 미동의(거부) 짝. 실제 데이터 mutation 이 없어야 하므로 시드한 todo 가
// reject 이후에도 살아있음을 openAPI GET 200 으로 확인.

async function pollJob(client, jobId, { timeoutMs = 8000, intervalMs = 100 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const res = await client.get(`/v1/ai/jobs/${jobId}`);
        if (res.status === 200 && ['DONE', 'CONFIRM', 'FAILED', 'REJECTED'].includes(res.data.status)) {
            return res.data;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`pollJob timeout (${timeoutMs}ms) — jobId: ${jobId}`);
}

describe('aiFrontAPI confirm 미동의(거부)', function () {

    let client;
    let openCli;

    before(function () {
        client = authedClient();
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        openCli = openClient({ pat: defaultMcpPat(), userToken });
    });

    // ────────────────────────────────────────────────────────────────────────
    describe('POST /v1/ai/command/reject — body validation', function () {

        it('job_id 누락 → 400', async function () {
            const res = await client.post(
                '/v1/ai/command/reject',
                {},
                { headers: { device_id: 'e2e-device-reject' } }
            );
            assert.strictEqual(res.status, 400);
        });

        it('device_id 헤더 누락 → 400', async function () {
            const res = await client.post(
                '/v1/ai/command/reject',
                { job_id: 'whatever' }
            );
            assert.strictEqual(res.status, 400);
        });

        it('존재하지 않는 job_id → 404', async function () {
            const res = await client.post(
                '/v1/ai/command/reject',
                { job_id: 'no-such-job' },
                { headers: { device_id: 'e2e-device-reject' } }
            );
            assert.strictEqual(res.status, 404);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    describe('골든 흐름 — 1차 CONFIRM → reject → REJECTED + 멱등 + mutation 없음', function () {

        let createdTodoId;
        let parentJobId;

        it('todo 시드 → 1차 [stub:CONFIRM:<id>] → CONFIRM 대기', async function () {
            this.timeout(15000);

            const createRes = await openCli.post('/v2/open/todos/', {
                name: 'AI reject e2e todo',
                event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
            });
            assert.strictEqual(createRes.status, 201);
            createdTodoId = createRes.data.uuid;

            const cmdRes = await client.post(
                '/v1/ai/command',
                {
                    command_text: `[stub:CONFIRM:${createdTodoId}] 이거 삭제해`,
                    timezone: 'Asia/Seoul'
                },
                { headers: { device_id: 'e2e-device-reject' } }
            );
            assert.strictEqual(cmdRes.status, 202);
            parentJobId = cmdRes.data.job_id;

            const job1 = await pollJob(client, parentJobId);
            assert.strictEqual(job1.status, 'CONFIRM');
        });

        it('reject 호출 → 204 → job 이 REJECTED 로 종결', async function () {
            this.timeout(15000);

            const rejectRes = await client.post(
                '/v1/ai/command/reject',
                { job_id: parentJobId },
                { headers: { device_id: 'e2e-device-reject' } }
            );
            assert.strictEqual(rejectRes.status, 204);

            const job = (await client.get(`/v1/ai/jobs/${parentJobId}`)).data;
            assert.strictEqual(job.status, 'REJECTED');
            // 거부된 action 이 result 에 보존됨 (무엇을 거부했는지 추적)
            assert.ok(job.result && job.result.action, 'CONFIRM result.action 보존');
        });

        it('중복 reject 호출 → 여전히 204, 상태 REJECTED 유지 (멱등)', async function () {
            this.timeout(15000);

            const rejectAgain = await client.post(
                '/v1/ai/command/reject',
                { job_id: parentJobId },
                { headers: { device_id: 'e2e-device-reject' } }
            );
            assert.strictEqual(rejectAgain.status, 204);

            const job = (await client.get(`/v1/ai/jobs/${parentJobId}`)).data;
            assert.strictEqual(job.status, 'REJECTED');
        });

        it('데이터 mutation 없음 — 시드한 todo 가 살아있음 (openAPI GET 200)', async function () {
            this.timeout(15000);

            const checkRes = await openCli.get(`/v2/open/todos/${createdTodoId}`);
            assert.strictEqual(checkRes.status, 200, 'reject 는 삭제하지 않음');
        });
    });
});
