
const assert = require('assert');
const AiController = require('../../../controllers/ai/aiController');
const Errors = require('../../../models/Errors');
const StubAiJobService = require('../../doubles/stubAiJobService');
const AiJob = require('../../../models/ai/AiJob');


function makeRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        send(data) { this.body = data; return this; }
    };
}

function makePostReq({ uid = 'user-1', deviceId = 'device-1', commandText = '오늘 할일 추가해줘', timezone = 'Asia/Seoul' } = {}) {
    return {
        auth: { uid },
        header: (name) => name === 'device_id' ? deviceId : null,
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
    let controller;

    beforeEach(() => {
        stubService = new StubAiJobService();
        controller = new AiController(stubService);
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
                timezone: 'Asia/Seoul'
            });
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
});
