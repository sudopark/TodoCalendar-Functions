
'use strict';

const assert = require('assert');
const JobService = require('../../../services/ai/jobService');
const StubAiJobRepository = require('../../doubles/stubAiJobRepository');
const StubAiUsageService = require('../../doubles/stubAiUsageService');
const AiJob = require('../../../models/ai/AiJob');
const AiJobResult = require('../../../models/ai/AiJobResult');

describe('JobService', () => {

    let service;
    let stubRepo;
    let stubUsageService;

    beforeEach(() => {
        stubRepo = new StubAiJobRepository();
        stubUsageService = new StubAiUsageService();
        service = new JobService(stubRepo, stubUsageService);
    });

    // ------------------------------------------------------------------ //
    // createJob
    // ------------------------------------------------------------------ //

    describe('createJob', () => {

        it('repository 로 PENDING / null result / 24h 후 expireAt 인 plain object 가 넘어가고 jobId 가 반환됨', async () => {
            const userId = 'user-1';
            const deviceId = 'device-1';
            const commandText = '내일 일정 알려줘';

            const before = Date.now();
            const jobId = await service.createJob({ userId, deviceId, commandText });
            const after = Date.now();

            assert.ok(typeof jobId === 'string' && jobId.length > 0, 'jobId 는 non-empty string');

            const { jobId: storedJobId, data } = stubRepo.lastPutPayload;
            assert.strictEqual(storedJobId, jobId);

            // plain prototype 검증 (Firestore custom-prototype 거부 회피)
            assert.strictEqual(
                Object.getPrototypeOf(data),
                Object.prototype,
                'put data 는 plain object 여야 함'
            );

            // 필드값 검증
            assert.strictEqual(data.userId, userId);
            assert.strictEqual(data.deviceId, deviceId);
            assert.strictEqual(data.commandText, commandText);
            assert.strictEqual(data.status, AiJob.STATUS.PENDING);
            assert.strictEqual(data.result, null);

            // createdAt / updatedAt 은 본 서비스가 만들지 않음 (repo 가 serverTimestamp 로 채움)
            assert.strictEqual(data.createdAt, undefined, 'createdAt 미포함');
            assert.strictEqual(data.updatedAt, undefined, 'updatedAt 미포함');

            // expireAt = now + 24h ± 1초
            assert.ok(data.expireAt instanceof Date, 'expireAt 은 Date');
            const expected24hLater = before + 24 * 60 * 60 * 1000;
            const drift = data.expireAt.getTime() - expected24hLater;
            assert.ok(
                drift >= 0 && drift <= (after - before) + 1000,
                `expireAt 이 now+24h 근처여야 함 (drift: ${drift}ms)`
            );
        });

        it('repository put 이 실패하면 에러를 그대로 propagate', async () => {
            stubRepo.shouldFailPut = true;
            await assert.rejects(
                () => service.createJob({ userId: 'u', deviceId: 'd', commandText: 'cmd' })
            );
        });

        it('createJob 은 mode=command + confirmPayload=null 로 plain object 를 박음', async () => {
            await service.createJob({ userId: 'u', deviceId: 'd', commandText: 'cmd', timezone: 'Asia/Seoul' });
            const { data } = stubRepo.lastPutPayload;
            assert.strictEqual(data.mode, AiJob.MODE.COMMAND);
            assert.strictEqual(data.confirmPayload, null);
        });

        it('lang 인자 — 박힌 값 그대로 doc 저장 (controller 가 Accept-Language 로 결정해 전달)', async () => {
            await service.createJob({ userId: 'u', deviceId: 'd', commandText: 'cmd', timezone: 'Asia/Seoul', lang: 'ko' });
            assert.strictEqual(stubRepo.lastPutPayload.data.lang, 'ko');
        });

        it('lang 누락 — default 영어 저장', async () => {
            await service.createJob({ userId: 'u', deviceId: 'd', commandText: 'cmd', timezone: 'Asia/Seoul' });
            assert.strictEqual(stubRepo.lastPutPayload.data.lang, 'en');
        });
    });

    // ------------------------------------------------------------------ //
    // createConfirmJob
    // ------------------------------------------------------------------ //

    describe('createConfirmJob', () => {

        // parent command job 을 미리 만들어 그 jobId 를 confirm 호출 시 parentJobId 로 사용.
        async function seedParent({ userId = 'u', commandText = '내일 일정 알려줘' } = {}) {
            return service.createJob({ userId, deviceId: 'd', commandText, timezone: 'Asia/Seoul', lang: 'ko' });
        }

        it('mode=confirm + confirmPayload 가 plain object 로 박히고 새 jobId 반환', async () => {
            const parentId = await seedParent({ userId: 'u', commandText: '오늘 할일 추가' });

            const before = Date.now();
            const jobId = await service.createConfirmJob({
                userId: 'u', deviceId: 'd',
                parentJobId: parentId,
                timezone: 'Asia/Seoul',
                confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
            });
            const after = Date.now();

            assert.ok(typeof jobId === 'string' && jobId.length > 0);
            assert.notStrictEqual(jobId, parentId, 'parent 와 다른 새 jobId');

            const { jobId: storedJobId, data } = stubRepo.lastPutPayload;
            assert.strictEqual(storedJobId, jobId);
            assert.strictEqual(Object.getPrototypeOf(data), Object.prototype);

            assert.strictEqual(data.userId, 'u');
            assert.strictEqual(data.deviceId, 'd');
            assert.strictEqual(data.timezone, 'Asia/Seoul');
            assert.strictEqual(data.mode, AiJob.MODE.CONFIRM);
            assert.deepStrictEqual(data.confirmPayload, { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' });
            assert.strictEqual(data.status, AiJob.STATUS.PENDING);
            assert.strictEqual(data.result, null);

            assert.ok(data.expireAt instanceof Date);
            const expected24hLater = before + 24 * 60 * 60 * 1000;
            const drift = data.expireAt.getTime() - expected24hLater;
            assert.ok(drift >= 0 && drift <= (after - before) + 1000);
        });

        it('parent 의 commandText 가 confirm job 의 commandText 로 복사됨 (#238)', async () => {
            const parentId = await seedParent({ userId: 'u', commandText: '오늘 할일 추가' });

            await service.createConfirmJob({
                userId: 'u', deviceId: 'd',
                parentJobId: parentId,
                timezone: 'Asia/Seoul',
                confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
            });

            assert.strictEqual(stubRepo.lastPutPayload.data.commandText, '오늘 할일 추가');
        });

        it('parent 미존재 → NotFound', async () => {
            await assert.rejects(
                () => service.createConfirmJob({
                    userId: 'u', deviceId: 'd',
                    parentJobId: 'nonexistent',
                    timezone: 'Asia/Seoul',
                    confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
                }),
                (err) => err.status === 404 && err.code === 'NotFound'
            );
        });

        it('parent 가 타인의 job → 403 Forbidden', async () => {
            const parentId = await seedParent({ userId: 'other-user', commandText: '타인 명령' });

            await assert.rejects(
                () => service.createConfirmJob({
                    userId: 'u', deviceId: 'd',
                    parentJobId: parentId,
                    timezone: 'Asia/Seoul',
                    confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
                }),
                (err) => err.status === 403 && err.code === 'Forbidden'
            );
        });

        it('두 번 호출하면 서로 다른 jobId 반환', async () => {
            const parentId = await seedParent();
            const payload = { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' };
            const a = await service.createConfirmJob({ userId: 'u', deviceId: 'd', parentJobId: parentId, timezone: 'UTC', confirmPayload: payload });
            const b = await service.createConfirmJob({ userId: 'u', deviceId: 'd', parentJobId: parentId, timezone: 'UTC', confirmPayload: payload });
            assert.notStrictEqual(a, b);
        });

        it('lang 인자 — confirm job 에 그대로 저장', async () => {
            const parentId = await seedParent();
            await service.createConfirmJob({
                userId: 'u', deviceId: 'd', parentJobId: parentId, timezone: 'Asia/Seoul', lang: 'ko',
                confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
            });
            assert.strictEqual(stubRepo.lastPutPayload.data.lang, 'ko');
        });
    });

    // ------------------------------------------------------------------ //
    // createJob 의 일일 한도 사전 차단 분기  (#157)
    // ------------------------------------------------------------------ //

    describe('createJob — 일일 한도 사전 차단', () => {

        it('한도 미달 — 기존 PENDING 흐름 (status=PENDING / result=null)', async () => {
            // stubUsageService 기본값 = isOverDailyLimit false
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd', timezone: 'Asia/Seoul', lang: 'ko'
            });
            assert.ok(typeof jobId === 'string');
            const { data } = stubRepo.lastPutPayload;
            assert.strictEqual(data.status, AiJob.STATUS.PENDING);
            assert.strictEqual(data.result, null);
        });

        it('한도 초과 — status=FAILED / errorCode=DailyLimitExceeded 가 박혀 jobId 반환 (PENDING 거치지 않음)', async () => {
            stubUsageService.setOverDailyLimit('u', true);

            const before = Date.now();
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd', timezone: 'Asia/Seoul', lang: 'ko'
            });
            const after = Date.now();

            assert.ok(typeof jobId === 'string' && jobId.length > 0);

            const { jobId: storedJobId, data } = stubRepo.lastPutPayload;
            assert.strictEqual(storedJobId, jobId);
            assert.strictEqual(Object.getPrototypeOf(data), Object.prototype);

            assert.strictEqual(data.userId, 'u');
            assert.strictEqual(data.deviceId, 'd');
            assert.strictEqual(data.commandText, 'cmd');
            assert.strictEqual(data.timezone, 'Asia/Seoul');
            assert.strictEqual(data.lang, 'ko');
            assert.strictEqual(data.mode, AiJob.MODE.COMMAND);
            assert.strictEqual(data.confirmPayload, null);
            assert.strictEqual(data.status, AiJob.STATUS.FAILED);

            assert.strictEqual(data.result.type, 'FAILED');
            assert.strictEqual(data.result.errorCode, 'DailyLimitExceeded');
            assert.ok(typeof data.result.reason === 'string' && data.result.reason.length > 0);
            // 한국어 워딩 (존댓말) 검증
            assert.ok(data.result.reason.includes('한도'), `ko reason 에 '한도' 포함 (got: ${data.result.reason})`);

            assert.ok(data.expireAt instanceof Date);
            const expected24hLater = before + 24 * 60 * 60 * 1000;
            const drift = data.expireAt.getTime() - expected24hLater;
            assert.ok(drift >= 0 && drift <= (after - before) + 1000);
        });

        it('한도 초과 + lang 누락 → en reason', async () => {
            stubUsageService.setOverDailyLimit('u', true);
            await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd', timezone: 'Asia/Seoul'
            });
            const { data } = stubRepo.lastPutPayload;
            assert.strictEqual(data.lang, 'en');
            assert.ok(data.result.reason.toLowerCase().includes('limit'), `en reason 에 'limit' 포함 (got: ${data.result.reason})`);
        });

        it('createConfirmJob 은 한도 적용 X — 한도 초과여도 PENDING / status=PENDING 그대로', async () => {
            // parent 는 한도 차단 전(setOverDailyLimit false) 에 먼저 seed
            const parentId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: '오늘 할일', timezone: 'Asia/Seoul', lang: 'ko'
            });
            stubUsageService.setOverDailyLimit('u', true);

            await service.createConfirmJob({
                userId: 'u', deviceId: 'd', parentJobId: parentId, timezone: 'Asia/Seoul', lang: 'ko',
                confirmPayload: { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' }
            });
            const { data } = stubRepo.lastPutPayload;
            assert.strictEqual(data.status, AiJob.STATUS.PENDING);
            assert.strictEqual(data.result, null);
        });
    });

    // ------------------------------------------------------------------ //
    // loadJob
    // ------------------------------------------------------------------ //

    describe('loadJob', () => {

        it('존재하는 jobId → AiJob 인스턴스 반환', async () => {
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });

            const job = await service.loadJob(jobId);
            assert.ok(job instanceof AiJob, 'AiJob 인스턴스 여야 함');
            assert.strictEqual(job.jobId, jobId);
            assert.strictEqual(job.status, AiJob.STATUS.PENDING);
        });

        it('없는 jobId → null 반환', async () => {
            const result = await service.loadJob('non-existent-id');
            assert.strictEqual(result, null);
        });

        it('repository load 가 실패하면 에러를 그대로 propagate', async () => {
            stubRepo.shouldFailLoad = true;
            await assert.rejects(
                () => service.loadJob('any-id')
            );
        });
    });

    // ------------------------------------------------------------------ //
    // transitionToRunning
    // ------------------------------------------------------------------ //

    describe('transitionToRunning', () => {

        it('PENDING 인 job → true + status RUNNING 으로 전이', async () => {
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });

            const result = await service.transitionToRunning(jobId);
            assert.strictEqual(result, true);

            const job = await service.loadJob(jobId);
            assert.strictEqual(job.status, AiJob.STATUS.RUNNING);
        });

        it('이미 RUNNING 인 job → false', async () => {
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });
            await service.transitionToRunning(jobId); // PENDING → RUNNING

            const result = await service.transitionToRunning(jobId); // RUNNING → false
            assert.strictEqual(result, false);
        });

        it('terminal(DONE) 상태인 job → false', async () => {
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });
            await service.transitionToRunning(jobId);
            await service.completeWith(jobId, AiJobResult.done('완료'));

            const result = await service.transitionToRunning(jobId);
            assert.strictEqual(result, false);
        });

        it('race 시뮬레이션 — 같은 jobId 에 두 번 호출 시 첫 번째 true, 두 번째 false', async () => {
            // 본 케이스는 stub 의 in-memory 동기 mutation 에 의존한 service 계약 검증
            // (jobService 가 결과를 그대로 위임하고 변형하지 않는다). 실제 Firestore
            // transaction 의 CAS 보장은 emulator E2E (Task 11) 에서 검증.
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });

            const [first, second] = await Promise.all([
                service.transitionToRunning(jobId),
                service.transitionToRunning(jobId)
            ]);

            // 둘 중 하나는 true, 하나는 false
            assert.ok(first === true || second === true, '적어도 하나는 true');
            assert.ok(first !== second, 'race 시 결과가 달라야 함');
        });
    });

    // ------------------------------------------------------------------ //
    // completeWith
    // ------------------------------------------------------------------ //

    describe('completeWith', () => {

        async function setupRunningJob() {
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });
            await service.transitionToRunning(jobId);
            return jobId;
        }

        it('done result → status DONE + result.type DONE', async () => {
            const jobId = await setupRunningJob();
            const result = AiJobResult.done('작업 완료');

            const success = await service.completeWith(jobId, result);
            assert.strictEqual(success, true);

            const job = await service.loadJob(jobId);
            assert.strictEqual(job.status, AiJob.STATUS.DONE);
            assert.strictEqual(job.result.type, 'DONE');
        });

        it('confirm result → status CONFIRM + result.type CONFIRM', async () => {
            const jobId = await setupRunningJob();
            const result = AiJobResult.confirm('확인 요청', { action: 'create_todo', payload: {} });

            const success = await service.completeWith(jobId, result);
            assert.strictEqual(success, true);

            const job = await service.loadJob(jobId);
            assert.strictEqual(job.status, AiJob.STATUS.CONFIRM);
            assert.strictEqual(job.result.type, 'CONFIRM');
        });

        it('failed result → status FAILED + result.type FAILED', async () => {
            const jobId = await setupRunningJob();
            const result = AiJobResult.failed('처리 실패 이유');

            const success = await service.completeWith(jobId, result);
            assert.strictEqual(success, true);

            const job = await service.loadJob(jobId);
            assert.strictEqual(job.status, AiJob.STATUS.FAILED);
            assert.strictEqual(job.result.type, 'FAILED');
        });

        it('PENDING 상태에서 completeWith → false (RUNNING 이 아님)', async () => {
            const jobId = await service.createJob({
                userId: 'u', deviceId: 'd', commandText: 'cmd'
            });

            const success = await service.completeWith(jobId, AiJobResult.done('text'));
            assert.strictEqual(success, false);
        });
    });
});
