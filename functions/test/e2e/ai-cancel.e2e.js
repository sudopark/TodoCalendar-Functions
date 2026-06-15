'use strict';

const assert = require('assert');

const { authedClient } = require('./helpers/request');

// 진행 중 작업 중지 (#250). reject 와 별개 엔드포인트.
//
// RUNNING 협조 중지의 mid-loop 타이밍은 stub anthropic 이 즉답이라 emulator 에서
// deterministic 하게 못 잡는다 (협조 로직은 단위 테스트가 커버). 여기서는 라우트
// 배선·검증·소유권·terminal no-op 멱등만 deterministic 하게 검증.

async function pollJob(client, jobId, { timeoutMs = 8000, intervalMs = 100 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const res = await client.get(`/v1/ai/jobs/${jobId}`);
        if (res.status === 200 && ['DONE', 'CONFIRM', 'FAILED', 'REJECTED', 'CANCELED'].includes(res.data.status)) {
            return res.data;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`pollJob timeout (${timeoutMs}ms) — jobId: ${jobId}`);
}

describe('aiFrontAPI cancel (진행 중 작업 중지)', function () {

    let client;

    before(function () {
        client = authedClient();
    });

    // ────────────────────────────────────────────────────────────────────────
    describe('POST /v1/ai/command/cancel — body validation', function () {

        it('job_id 누락 → 400', async function () {
            const res = await client.post(
                '/v1/ai/command/cancel',
                {},
                { headers: { device_id: 'e2e-device-cancel' } }
            );
            assert.strictEqual(res.status, 400);
        });

        it('device_id 헤더 누락 → 400', async function () {
            const res = await client.post(
                '/v1/ai/command/cancel',
                { job_id: 'whatever' }
            );
            assert.strictEqual(res.status, 400);
        });

        it('존재하지 않는 job_id → 404', async function () {
            const res = await client.post(
                '/v1/ai/command/cancel',
                { job_id: 'no-such-job' },
                { headers: { device_id: 'e2e-device-cancel' } }
            );
            assert.strictEqual(res.status, 404);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    describe('terminal no-op — 이미 DONE 인 job 중지는 202 + 상태 보존 (멱등)', function () {

        let jobId;

        it('명령 → DONE 종결까지 대기', async function () {
            this.timeout(15000);

            const cmdRes = await client.post(
                '/v1/ai/command',
                { command_text: '오늘 할일 보여줘', timezone: 'Asia/Seoul' },
                { headers: { device_id: 'e2e-device-cancel' } }
            );
            assert.strictEqual(cmdRes.status, 202);
            jobId = cmdRes.data.job_id;

            const job = await pollJob(client, jobId);
            assert.strictEqual(job.status, 'DONE');
        });

        it('cancel 호출 → 202, 상태는 DONE 그대로 (no-op)', async function () {
            this.timeout(15000);

            const cancelRes = await client.post(
                '/v1/ai/command/cancel',
                { job_id: jobId },
                { headers: { device_id: 'e2e-device-cancel' } }
            );
            assert.strictEqual(cancelRes.status, 202);

            const job = (await client.get(`/v1/ai/jobs/${jobId}`)).data;
            assert.strictEqual(job.status, 'DONE', 'terminal job 은 중지로 안 바뀜');
        });

        it('중복 cancel → 여전히 202, DONE 유지 (멱등)', async function () {
            this.timeout(15000);

            const again = await client.post(
                '/v1/ai/command/cancel',
                { job_id: jobId },
                { headers: { device_id: 'e2e-device-cancel' } }
            );
            assert.strictEqual(again.status, 202);

            const job = (await client.get(`/v1/ai/jobs/${jobId}`)).data;
            assert.strictEqual(job.status, 'DONE');
        });
    });
});
