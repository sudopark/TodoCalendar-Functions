
const assert = require('assert');
const AiController = require('../../../controllers/ai/aiController');
const Errors = require('../../../models/Errors');
const StubAiJobService = require('../../doubles/stubAiJobService');
const StubAiUsageService = require('../../doubles/stubAiUsageService');
const AiJob = require('../../../models/ai/AiJob');


function makeRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        send(data) { this.body = data; return this; }
    };
}

function makePostReq({ uid = 'user-1', deviceId = 'device-1', commandText = '오늘 할일 추가해줘', timezone = 'Asia/Seoul', acceptLanguage = null } = {}) {
    return {
        auth: { uid },
        header: (name) => {
            if (name === 'device_id') return deviceId;
            if (name === 'accept-language') return acceptLanguage;
            return null;
        },
        body: { command_text: commandText, timezone }
    };
}

function makeGetReq({ uid = 'user-1', jobId = 'job-123' } = {}) {
    return {
        auth: { uid },
        params: { id: jobId }
    };
}

function makeJob({ jobId = 'job-123', userId = 'user-1' } = {}) {
    return new AiJob({
        jobId,
        userId,
        deviceId: 'device-1',
        commandText: '오늘 할일 추가해줘',
        status: AiJob.STATUS.PENDING,
        result: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expireAt: null
    });
}


describe('AiController', () => {

    let stubService;
    let stubUsageService;
    let controller;

    beforeEach(() => {
        stubService = new StubAiJobService();
        stubUsageService = new StubAiUsageService();
        controller = new AiController(stubService, stubUsageService);
    });


    // MARK: - postCommand

    describe('postCommand', () => {

        it('정상 — 202 + job_id 응답, jobService 인자 검증', async () => {
            const req = makePostReq();
            const res = makeRes();

            await controller.postCommand(req, res);

            assert.equal(res.statusCode, 202);
            assert.deepEqual(res.body, { job_id: 'job-123' });
            assert.deepEqual(stubService.lastCreateJobArgs, {
                userId: 'user-1',
                deviceId: 'device-1',
                commandText: '오늘 할일 추가해줘',
                timezone: 'Asia/Seoul',
                lang: 'en'
            });
        });

        it('Accept-Language: ko-KR 헤더가 있으면 lang=ko 전달', async () => {
            const req = makePostReq({ acceptLanguage: 'ko-KR,ko;q=0.9,en;q=0.8' });
            const res = makeRes();

            await controller.postCommand(req, res);

            assert.equal(stubService.lastCreateJobArgs.lang, 'ko');
        });

        it('Accept-Language 헤더 없으면 lang=en (default)', async () => {
            const req = makePostReq({ acceptLanguage: null });
            const res = makeRes();

            await controller.postCommand(req, res);

            assert.equal(stubService.lastCreateJobArgs.lang, 'en');
        });

        it('device_id 헤더 누락 → 400 BadRequest', async () => {
            const req = makePostReq({ deviceId: null });
            const res = makeRes();

            try {
                await controller.postCommand(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.BadRequest);
                assert.equal(error.status, 400);
                assert.equal(error.message, 'device_id header is required');
            }
        });

        it('device_id 빈 문자열 → 400 BadRequest', async () => {
            const req = makePostReq({ deviceId: '' });
            const res = makeRes();

            try {
                await controller.postCommand(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.BadRequest);
                assert.equal(error.status, 400);
            }
        });

        it('command_text 누락 → 400 BadRequest', async () => {
            const req = {
                auth: { uid: 'user-1' },
                header: (name) => name === 'device_id' ? 'device-1' : null,
                body: {}
            };
            const res = makeRes();

            try {
                await controller.postCommand(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.BadRequest);
                assert.equal(error.status, 400);
                assert.equal(error.message, 'command_text is required');
            }
        });

        it('command_text 빈 문자열 → 400 BadRequest', async () => {
            const req = makePostReq({ commandText: '' });
            const res = makeRes();

            try {
                await controller.postCommand(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.BadRequest);
                assert.equal(error.status, 400);
            }
        });

        it('timezone 누락 → 400 BadRequest', async () => {
            const req = {
                auth: { uid: 'user-1' },
                header: (name) => name === 'device_id' ? 'device-1' : null,
                body: { command_text: '오늘 할일 추가해줘' }
            };
            const res = makeRes();

            try {
                await controller.postCommand(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.BadRequest);
                assert.equal(error.status, 400);
                assert.equal(error.message, 'timezone is required');
            }
        });

        it('유효하지 않은 IANA timezone → 400 BadRequest', async () => {
            const req = makePostReq({ timezone: 'Not/ATimezone' });
            const res = makeRes();

            try {
                await controller.postCommand(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.BadRequest);
                assert.equal(error.status, 400);
            }
        });

        it('유효한 IANA timezone 은 jobService.createJob 에 그대로 전달', async () => {
            const req = makePostReq({ timezone: 'America/Los_Angeles' });
            const res = makeRes();

            await controller.postCommand(req, res);

            assert.equal(stubService.lastCreateJobArgs.timezone, 'America/Los_Angeles');
        });
    });


    // MARK: - postCommandConfirm

    describe('postCommandConfirm', () => {

        function makeConfirmReq({
            uid = 'user-1', deviceId = 'device-1',
            timezone = 'Asia/Seoul',
            tool = 'delete_todo', args = { todo_id: 't1' }, confirmToken = 'tk',
            acceptLanguage = null
        } = {}) {
            return {
                auth: { uid },
                header: (name) => {
                    if (name === 'device_id') return deviceId;
                    if (name === 'accept-language') return acceptLanguage;
                    return null;
                },
                body: {
                    timezone,
                    tool, args, confirm_token: confirmToken
                }
            };
        }

        it('정상 — 202 + job_id, createConfirmJob 인자에 confirmPayload 묶여 전달 (commandText 안 받음)', async () => {
            const req = makeConfirmReq();
            const res = makeRes();

            await controller.postCommandConfirm(req, res);

            assert.equal(res.statusCode, 202);
            assert.deepEqual(res.body, { job_id: 'job-123' });
            assert.deepEqual(stubService.lastCreateConfirmJobArgs, {
                userId: 'user-1',
                deviceId: 'device-1',
                timezone: 'Asia/Seoul',
                lang: 'en',
                confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
            });
        });

        it('Accept-Language: ko 헤더가 있으면 lang=ko 전달', async () => {
            const req = makeConfirmReq({ acceptLanguage: 'ko' });
            await controller.postCommandConfirm(req, makeRes());

            assert.equal(stubService.lastCreateConfirmJobArgs.lang, 'ko');
        });

        it('device_id 헤더 누락 → 400', async () => {
            const req = makeConfirmReq({ deviceId: null });
            await assert.rejects(() => controller.postCommandConfirm(req, makeRes()), Errors.BadRequest);
        });

        it('command_text 박혀 와도 무시 — confirm body 에서 안 씀, lang 은 Accept-Language 로', async () => {
            const req = makeConfirmReq();
            req.body.command_text = '클라가 잘못 박은 값';
            const res = makeRes();
            await controller.postCommandConfirm(req, res);
            assert.equal(res.statusCode, 202);
            // createConfirmJob 인자에 commandText 키 자체가 없어야 함
            assert.strictEqual('commandText' in stubService.lastCreateConfirmJobArgs, false);
        });

        it('timezone 누락 — optional 이라 정상 통과 (createConfirmJob 에 timezone=null)', async () => {
            const req = makeConfirmReq();
            delete req.body.timezone;
            const res = makeRes();
            await controller.postCommandConfirm(req, res);
            assert.equal(res.statusCode, 202);
            assert.equal(stubService.lastCreateConfirmJobArgs.timezone, null);
        });

        it('timezone 이 invalid IANA → 400 (박혀 왔다면 형식 검증)', async () => {
            const req = makeConfirmReq({ timezone: 'Not/ATz' });
            await assert.rejects(() => controller.postCommandConfirm(req, makeRes()), Errors.BadRequest);
        });

        it('tool 누락 → 400', async () => {
            const req = makeConfirmReq();
            delete req.body.tool;
            await assert.rejects(() => controller.postCommandConfirm(req, makeRes()), Errors.BadRequest);
        });

        it('args 누락 → 400', async () => {
            const req = makeConfirmReq();
            delete req.body.args;
            await assert.rejects(() => controller.postCommandConfirm(req, makeRes()), Errors.BadRequest);
        });

        it('args 가 array → 400 (object 가 아님)', async () => {
            const req = makeConfirmReq();
            req.body.args = ['t1'];
            await assert.rejects(() => controller.postCommandConfirm(req, makeRes()), Errors.BadRequest);
        });

        it('confirm_token 누락 → 400', async () => {
            const req = makeConfirmReq();
            delete req.body.confirm_token;
            await assert.rejects(() => controller.postCommandConfirm(req, makeRes()), Errors.BadRequest);
        });
    });


    // MARK: - getJob

    describe('getJob', () => {

        it('본인 job → 200 + job 직렬화 응답', async () => {
            const job = makeJob({ jobId: 'job-123', userId: 'user-1' });
            stubService.seedJob(job);
            const req = makeGetReq({ uid: 'user-1', jobId: 'job-123' });
            const res = makeRes();

            await controller.getJob(req, res);

            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, job.toJSON());
        });

        it('타인 job → 403 Forbidden throw (auth middleware 와 일관)', async () => {
            const job = makeJob({ jobId: 'job-123', userId: 'other-user' });
            stubService.seedJob(job);
            const req = makeGetReq({ uid: 'user-1', jobId: 'job-123' });
            const res = makeRes();

            try {
                await controller.getJob(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.Base);
                assert.equal(error.status, 403);
                assert.equal(error.code, 'Forbidden');
            }
        });

        it('미존재 job → 404 NotFound', async () => {
            const req = makeGetReq({ uid: 'user-1', jobId: 'nonexistent' });
            const res = makeRes();

            try {
                await controller.getJob(req, res);
                assert.fail('에러가 발생해야 합니다');
            } catch (error) {
                assert.ok(error instanceof Errors.NotFound);
                assert.equal(error.status, 404);
                assert.equal(error.message, 'job not found');
            }
        });
    });


    // MARK: - getUsage

    describe('getUsage', () => {

        it('오늘 사용량 존재 — 200 + AiUsage.toJSON 응답', async () => {
            stubUsageService.seedUsage('user-1', {
                inputTokens: 1234,
                outputTokens: 567,
                updatedAt: new Date('2026-05-22T10:00:00.000Z'),
                dateKey: '2026-05-22'
            });
            const req = { auth: { uid: 'user-1' } };
            const res = makeRes();

            await controller.getUsage(req, res);

            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, {
                date: '2026-05-22',
                input_tokens: 1234,
                output_tokens: 567,
                updated_at: '2026-05-22T10:00:00.000Z'
            });
        });

        it('오늘 사용량 doc 미존재 — 200 + 0/0/null 빈 응답 (caller 가 null 분기 안 하게)', async () => {
            // seed 없음 → service 가 AiUsage.empty 반환
            const req = { auth: { uid: 'user-no-history' } };
            const res = makeRes();

            await controller.getUsage(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.input_tokens, 0);
            assert.equal(res.body.output_tokens, 0);
            assert.equal(res.body.updated_at, null);
            assert.ok(typeof res.body.date === 'string', 'date 필드는 비어있지 않음');
        });
    });
});
