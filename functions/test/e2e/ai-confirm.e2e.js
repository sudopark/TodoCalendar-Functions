'use strict';

const assert = require('assert');

const { authedClient } = require('./helpers/request');
const { signUserToken, openClient, defaultMcpPat } = require('./helpers/openClient');
const { TEST_USER_UID } = require('./seeds/commonData');

// 1차 [stub:CONFIRM:<id>] → CONFIRM → 2차 confirm endpoint → DONE 흐름 검증.
// FakeAnthropicClient markerFallback 이 [stub:CONFIRM:<id>] 를 delete_todo({todo_id:<id>})
// tool_use 로 매핑하기 때문에 실제 openAPI todo 를 시드한 뒤 그 id 로 시나리오 진행.

async function pollJob(client, jobId, { timeoutMs = 8000, intervalMs = 100 } = {}) {
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

describe('aiFrontAPI confirm 2차 호출', function () {

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
    describe('POST /v1/ai/command/confirm — body validation', function () {

        it('필수 body 누락 (tool) → 400', async function () {
            const res = await client.post(
                '/v1/ai/command/confirm',
                {
                    command_text: 'delete',
                    timezone: 'Asia/Seoul',
                    args: { todo_id: 't1' },
                    confirm_token: 'tk'
                },
                { headers: { device_id: 'e2e-device-confirm' } }
            );
            assert.strictEqual(res.status, 400);
        });

        it('args 가 array → 400', async function () {
            const res = await client.post(
                '/v1/ai/command/confirm',
                {
                    command_text: 'delete',
                    timezone: 'Asia/Seoul',
                    tool: 'delete_todo',
                    args: ['t1'],
                    confirm_token: 'tk'
                },
                { headers: { device_id: 'e2e-device-confirm' } }
            );
            assert.strictEqual(res.status, 400);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    describe('골든 흐름 — 1차 CONFIRM → 2차 DONE → 실제 삭제 확인', function () {

        let createdTodoId;
        let confirmAction;

        it('todo 시드 (openAPI POST) → 1차 [stub:CONFIRM:<id>] → CONFIRM + result.action 추출', async function () {
            this.timeout(15000);

            // 1) todo 시드
            const createRes = await openCli.post('/v2/open/todos/', {
                name: 'AI confirm e2e todo',
                event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
            });
            assert.strictEqual(createRes.status, 201);
            createdTodoId = createRes.data.uuid;

            // 2) 1차 command — FakeAnthropicClient 가 [stub:CONFIRM:<id>] 매칭해 delete_todo tool_use 반환
            const cmdRes = await client.post(
                '/v1/ai/command',
                {
                    command_text: `[stub:CONFIRM:${createdTodoId}] 이거 삭제해`,
                    timezone: 'Asia/Seoul'
                },
                { headers: { device_id: 'e2e-device-confirm' } }
            );
            assert.strictEqual(cmdRes.status, 202);

            const job1 = await pollJob(client, cmdRes.data.job_id);
            assert.strictEqual(job1.status, 'CONFIRM');
            assert.strictEqual(job1.result.type, 'CONFIRM');
            assert.ok(job1.result.action, 'result.action 존재');
            assert.strictEqual(job1.result.action.tool, 'delete_todo');
            assert.deepStrictEqual(job1.result.action.args, { todo_id: createdTodoId });
            assert.ok(job1.result.action.confirmToken, 'confirmToken 존재');

            confirmAction = job1.result.action;
        });

        it('2차 confirm endpoint → DONE + 실제 todo 삭제 확인 (openAPI GET 404)', async function () {
            this.timeout(15000);

            const confirmRes = await client.post(
                '/v1/ai/command/confirm',
                {
                    command_text: '이거 삭제해',
                    timezone: 'Asia/Seoul',
                    tool: confirmAction.tool,
                    args: confirmAction.args,
                    confirm_token: confirmAction.confirmToken
                },
                { headers: { device_id: 'e2e-device-confirm' } }
            );
            assert.strictEqual(confirmRes.status, 202);

            const job2 = await pollJob(client, confirmRes.data.job_id);
            assert.strictEqual(job2.status, 'DONE', `2차 호출 결과가 DONE 이어야 함 (actual: ${JSON.stringify(job2.result)})`);
            assert.strictEqual(job2.result.type, 'DONE');

            // 2차 job 의 mode 가 'confirm' 으로 응답에 노출됨
            assert.strictEqual(job2.mode, 'confirm');

            // 실 todo 가 삭제됐는지 — openAPI GET → 404
            const checkRes = await openCli.get(`/v2/open/todos/${createdTodoId}`);
            assert.strictEqual(checkRes.status, 404, 'todo 가 실제로 삭제됨');
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    describe('verify 실패 — 변조된 confirm_token → FAILED', function () {

        it('전혀 다른 token 으로 2차 호출 → FAILED (lib verify 실패)', async function () {
            this.timeout(15000);

            const res = await client.post(
                '/v1/ai/command/confirm',
                {
                    command_text: 'delete',
                    timezone: 'Asia/Seoul',
                    tool: 'delete_todo',
                    args: { todo_id: 'never-existed' },
                    confirm_token: 'invalid.token.value'
                },
                { headers: { device_id: 'e2e-device-confirm' } }
            );
            assert.strictEqual(res.status, 202);

            const job = await pollJob(client, res.data.job_id);
            assert.strictEqual(job.status, 'FAILED');
            assert.strictEqual(job.result.type, 'FAILED');
            assert.ok(job.result.reason, 'reason 노출');
        });
    });
});
