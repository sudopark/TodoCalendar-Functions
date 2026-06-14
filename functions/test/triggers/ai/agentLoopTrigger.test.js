'use strict';

const assert = require('assert');
const AgentLoopHandler = require('../../../triggers/ai/agentLoopHandler');
const { FALLBACK_NOTIFICATION } = require('../../../triggers/ai/agentLoopHandler');
const StubAiJobRepository = require('../../doubles/stubAiJobRepository');
const JobService = require('../../../services/ai/jobService');
const AiJob = require('../../../models/ai/AiJob');
const AiJobResult = require('../../../models/ai/AiJobResult');

// ── helpers ──────────────────────────────────────────────────────────────────

function makeEvent(jobId, rawData) {
    return {
        params: { jobId },
        data: { data: () => rawData }
    };
}

const BASE_JOB_DATA = {
    userId: 'user-1',
    deviceId: 'device-1',
    commandText: '내일 회의 잡아줘',
    timezone: 'Asia/Seoul',
    lang: 'ko',
    status: AiJob.STATUS.PENDING,
    result: null,
    expireAt: new Date(Date.now() + 86400_000)
};

const EN_JOB_DATA = {
    ...BASE_JOB_DATA,
    commandText: 'schedule a meeting tomorrow',
    lang: 'en'
};

const BASE_DEVICE = {
    deviceId: 'device-1',
    userId: 'user-1',
    pushToken: 'fcm-token-abc',
    deviceModel: 'iPhone'
};

// ── stub factories ────────────────────────────────────────────────────────────

function makeMessaging() {
    return {
        lastSendPayload: null,
        sendCalled: 0,
        async send(payload) {
            this.lastSendPayload = payload;
            this.sendCalled += 1;
        }
    };
}

function makeUserRepository(device) {
    return {
        async loadUserDevice(_deviceId) {
            return device ?? null;
        }
    };
}

function makeAgentLoopService(resultOverride, usageOverride) {
    return {
        lastRunArgs: null,
        allRunArgs: [],
        lastRunConfirmArgs: null,
        allRunConfirmArgs: [],
        async run(commandText, opts) {
            this.lastRunArgs = { commandText, opts };
            this.allRunArgs.push({ commandText, opts });
            return {
                result: resultOverride ?? AiJobResult.done('stub done'),
                usage: usageOverride ?? { inputTokens: 0, outputTokens: 0 }
            };
        },
        async runConfirm(payload, opts) {
            this.lastRunConfirmArgs = { payload, opts };
            this.allRunConfirmArgs.push({ payload, opts });
            return {
                result: resultOverride ?? AiJobResult.done('stub done'),
                usage: usageOverride ?? { inputTokens: 0, outputTokens: 0 }
            };
        }
    };
}

// warn/error 로그 캡처
function captureLogger() {
    const warns = [];
    const errors = [];
    return {
        warns,
        errors,
        logger: {
            warn(...args) { warns.push(args); },
            error(...args) { errors.push(args); },
            info(...args) {}
        }
    };
}

// seeded stub repo (PENDING 상태 job 미리 저장)
function seededRepo(jobId = 'job-1', data = BASE_JOB_DATA) {
    const repo = new StubAiJobRepository();
    repo._store.set(jobId, Object.assign({}, data));
    return repo;
}

function makeAiUsageService() {
    return {
        allRecordCalls: [],
        lastRecordCall: null,
        shouldFailRecord: false,
        async recordUsage(userId, tokens) {
            if (this.shouldFailRecord) throw new Error('stub recordUsage failed');
            const call = { userId, tokens };
            this.allRecordCalls.push(call);
            this.lastRecordCall = call;
        }
    };
}

function makeHandler({ jobService, agentLoopService, aiUsageService, userRepository, messaging, logger }) {
    return new AgentLoopHandler({
        jobService,
        agentLoopService,
        aiUsageService: aiUsageService ?? makeAiUsageService(),
        userRepository,
        messaging,
        logger
    });
}

// ── cases ─────────────────────────────────────────────────────────────────────

describe('AgentLoopHandler', () => {

    it('정상 발화 — result.notification 없을 때 fallback DONE 카피로 FCM 발송', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.done('stub done')); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1, 'FCM send 1회');
        const payload = messaging.lastSendPayload;
        assert.strictEqual(payload.token, BASE_DEVICE.pushToken);
        assert.strictEqual(payload.notification.title, FALLBACK_NOTIFICATION.ko.DONE.title);
        assert.strictEqual(payload.notification.body, FALLBACK_NOTIFICATION.ko.DONE.body);
        assert.strictEqual(payload.data.jobId, 'job-1');
        assert.strictEqual(payload.data.status, 'DONE');

        // handler 가 agentLoopService.run 에 commandText 와 {userId, timezone, lang, jobId} 을 정확히 전달하는지 검증 (재발 방지)
        assert.deepStrictEqual(agentLoopService.lastRunArgs, {
            commandText: BASE_JOB_DATA.commandText,
            opts: { userId: BASE_JOB_DATA.userId, timezone: BASE_JOB_DATA.timezone, lang: BASE_JOB_DATA.lang, jobId: 'job-1' }
        });
    });

    it('정상 발화 — result.notification 있으면 그 값으로 FCM 발송', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const customNotification = { title: '커스텀 제목', body: '커스텀 본문' };
        const agentLoopService = makeAgentLoopService(AiJobResult.done('stub done', customNotification));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        const payload = messaging.lastSendPayload;
        assert.strictEqual(payload.notification.title, customNotification.title);
        assert.strictEqual(payload.notification.body, customNotification.body);
    });

    it('같은 job 두 번째 발화 — transition CAS 실패로 agentLoop / FCM 모두 skip', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        let runCalled = 0;
        const agentLoopService = {
            async run() { runCalled += 1; return { result: AiJobResult.done('x'), usage: { inputTokens: 0, outputTokens: 0 } }; }
        };
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));  // 1st — succeeds
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));  // 2nd — transition false

        assert.strictEqual(runCalled, 1, 'agentLoop.run 은 1번만');
        assert.strictEqual(messaging.sendCalled, 1, 'FCM 은 1번만');
    });

    it('device 미존재 — completeWith 까지는 호출, FCM skip + warn 로그', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService();
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(null); // device 없음
        const { warns, logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        const stored = repo._store.get('job-1');
        assert.strictEqual(stored.status, 'DONE', 'job 이 DONE 으로 종결');
        assert.strictEqual(messaging.sendCalled, 0, 'FCM 미호출');
        assert.ok(warns.length > 0, 'warn 로그 존재');
    });

    it('device.userId 가 job.userId 와 다르면 (기기 재할당) FCM skip + warn 로그', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService();
        const messaging = makeMessaging();
        const mismatchDevice = { ...BASE_DEVICE, userId: 'other-user' };
        const userRepo = makeUserRepository(mismatchDevice);
        const { warns, logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        const stored = repo._store.get('job-1');
        assert.strictEqual(stored.status, 'DONE', 'job 이 DONE 으로 종결');
        assert.strictEqual(messaging.sendCalled, 0, 'FCM 미호출');
        assert.ok(warns.length > 0, 'warn 로그 존재');
    });

    it('result.type 이 CONFIRM 일 때 FCM 에 fallback CONFIRM 카피 사용', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.confirm('stub confirm', { stub: true })); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.ko.CONFIRM.title);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'CONFIRM');
    });

    it('result.type 이 FAILED 일 때 FCM 에 fallback FAILED 카피 사용', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.failed('stub failed')); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.ko.FAILED.title);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'FAILED');
    });

    it('result.notification 의 title 이 빈 문자열이면 hasNotification false → fallback 사용', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const partialNotification = { title: '', body: '본문은 있음' };
        const agentLoopService = makeAgentLoopService(AiJobResult.done('stub done', partialNotification));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.ko.DONE.title);
    });

    it('FCM 발송 중 네트워크 오류로 throw 가 발생해도 핸들러는 정상 종료', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService();
        const failMessaging = {
            async send() { throw new Error('FCM network error'); }
        };
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { errors, logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging: failMessaging, logger });

        await assert.doesNotReject(() => handler.handle(makeEvent('job-1', BASE_JOB_DATA)));
        assert.ok(errors.length > 0, 'error 로그 기록');
    });

    it('agentLoopService.run 이 throw 하면 RUNNING 고착 대신 FAILED 로 종결 + FCM 발송', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const throwingLoop = {
            async run(_commandText, _opts) { throw new Error('claude api timeout'); }
        };
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { errors, logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService: throwingLoop, userRepository: userRepo, messaging, logger });

        await assert.doesNotReject(() => handler.handle(makeEvent('job-1', BASE_JOB_DATA)));

        const stored = repo._store.get('job-1');
        assert.strictEqual(stored.status, AiJob.STATUS.FAILED);
        assert.strictEqual(stored.result.type, 'FAILED');

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.ko.FAILED.title);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'FAILED');

        assert.ok(errors.length > 0, 'agentLoop 실패 error 로그');
    });

    it('DONE result.notification 이 없고 commandText 가 영어이면 영어 fallback 적용', async () => {
        const repo = seededRepo('job-1', EN_JOB_DATA);
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.done('stub done')); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', EN_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.en.DONE.title);
        assert.strictEqual(messaging.lastSendPayload.notification.body, FALLBACK_NOTIFICATION.en.DONE.body);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'DONE');
    });

    it('CONFIRM result.notification 이 없고 commandText 가 영어이면 영어 fallback 적용', async () => {
        const repo = seededRepo('job-1', EN_JOB_DATA);
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.confirm('stub confirm', { stub: true }));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', EN_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.en.CONFIRM.title);
        assert.strictEqual(messaging.lastSendPayload.notification.body, FALLBACK_NOTIFICATION.en.CONFIRM.body);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'CONFIRM');
    });

    it('FAILED result.notification 이 없고 commandText 가 영어이면 영어 fallback 적용', async () => {
        const repo = seededRepo('job-1', EN_JOB_DATA);
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.failed('stub failed'));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', EN_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.en.FAILED.title);
        assert.strictEqual(messaging.lastSendPayload.notification.body, FALLBACK_NOTIFICATION.en.FAILED.body);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'FAILED');
    });

    it('completeWith 가 false 를 반환하면 (외부 race) FCM 발송 skip + warn 로그', async () => {
        const repo = seededRepo();
        // jobService stub — transitionToRunning 은 true, completeWith 는 false 로 강제
        const jobService = {
            async transitionToRunning(_jobId) { return true; },
            async completeWith(_jobId, _result) { return false; }
        };
        const agentLoopService = makeAgentLoopService();
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { warns, logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 0, 'FCM 미호출');
        assert.ok(warns.length > 0, 'race warn 로그');
    });

    // ─── usage record (#156) ──────────────────────────────────────────────────

    it('DONE 결과로 종결되면 aiUsageService.recordUsage 가 job.userId 와 usage 토큰으로 호출됨', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(
            AiJobResult.done('stub done'),
            { inputTokens: 1200, outputTokens: 340 }
        );
        const aiUsageService = makeAiUsageService();
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, aiUsageService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(aiUsageService.allRecordCalls.length, 1);
        assert.deepStrictEqual(aiUsageService.lastRecordCall, {
            userId: BASE_JOB_DATA.userId,
            tokens: { inputTokens: 1200, outputTokens: 340 }
        });
    });

    it('CONFIRM 결과로 종결되어도 동일하게 usage record 호출', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(
            AiJobResult.confirm('stub confirm', { stub: true }),
            { inputTokens: 500, outputTokens: 60 }
        );
        const aiUsageService = makeAiUsageService();
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, aiUsageService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.deepStrictEqual(aiUsageService.lastRecordCall, {
            userId: BASE_JOB_DATA.userId,
            tokens: { inputTokens: 500, outputTokens: 60 }
        });
    });

    it('FAILED 결과 (finalize 또는 cap 초과) 종결 시에도 usage record 호출', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(
            AiJobResult.failed('stub failed'),
            { inputTokens: 800, outputTokens: 200 }
        );
        const aiUsageService = makeAiUsageService();
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, aiUsageService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.deepStrictEqual(aiUsageService.lastRecordCall, {
            userId: BASE_JOB_DATA.userId,
            tokens: { inputTokens: 800, outputTokens: 200 }
        });
    });

    it('agentLoopService.run 이 throw 한 경로에서는 usage record 호출되지 않음 (partial usage 손실)', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const throwingLoop = {
            async run(_commandText, _opts) { throw new Error('claude api timeout'); }
        };
        const aiUsageService = makeAiUsageService();
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService: throwingLoop, aiUsageService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(aiUsageService.allRecordCalls.length, 0);
    });

    it('aiUsageService.recordUsage 가 throw 해도 후속 FCM 발송은 정상 진행', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(
            AiJobResult.done('stub done'),
            { inputTokens: 100, outputTokens: 30 }
        );
        const aiUsageService = makeAiUsageService();
        aiUsageService.shouldFailRecord = true;
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, aiUsageService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1, 'record 실패와 무관하게 FCM 발송');
    });

    // ─── mode 분기 (#158) ────────────────────────────────────────────────────

    it('mode=confirm job → runConfirm 호출, run 호출 X, confirmPayload 그대로 전달', async () => {
        const confirmPayload = { tool: 'delete_todo', args: { todo_id: 't1' }, confirmToken: 'tk' };
        const confirmJobData = {
            ...BASE_JOB_DATA,
            mode: AiJob.MODE.CONFIRM,
            confirmPayload
        };
        const repo = seededRepo('job-cf', confirmJobData);
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.done('done'));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-cf', confirmJobData));

        assert.strictEqual(agentLoopService.allRunArgs.length, 0, 'run 호출 X');
        assert.strictEqual(agentLoopService.allRunConfirmArgs.length, 1, 'runConfirm 1회');
        assert.deepStrictEqual(agentLoopService.lastRunConfirmArgs, {
            payload: confirmPayload,
            opts: { userId: BASE_JOB_DATA.userId, lang: BASE_JOB_DATA.lang }
        });
        assert.strictEqual(messaging.sendCalled, 1, 'FCM 정상 발송');
    });

    it('mode=command (default) job → run 호출, runConfirm 호출 X — 기존 흐름 회귀 가드', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo, makeAiUsageService());
        const agentLoopService = makeAgentLoopService(AiJobResult.done('done'));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(agentLoopService.allRunArgs.length, 1);
        assert.strictEqual(agentLoopService.allRunConfirmArgs.length, 0);
    });

    // ─── 에러 로그 sanitize (#160) ─────────────────────────────────────────────
    //
    // Cloud Logging 에 err 객체를 raw dump 하면 SDK 에러 안의 stack / response headers /
    // request body / 우발적 secret 이 함께 박힘. helper 가 { code, status, message } 만
    // 추출하고 message 는 길이 캡 적용해야 함.

    describe('에러 로그 sanitize (#160)', () => {

        function makeFatErr() {
            // Anthropic SDK 류 fat error: 추가 필드와 stack 포함
            const err = new Error('upstream failed: api key abc-secret-12345 rejected');
            err.code = 'unauthorized';
            err.status = 401;
            err.headers = { 'x-api-key': 'leaked-secret' };
            err.response = { body: { detail: 'leaked' } };
            err.request = { url: 'https://api.anthropic.com/v1/messages', body: { messages: ['leaked'] } };
            return err;
        }

        function assertSanitized(loggedPayload, expected) {
            assert.ok(loggedPayload.error, 'error key 존재');
            assert.strictEqual('err' in loggedPayload, false, 'err key (raw) 가 더 이상 없음');
            assert.deepStrictEqual(Object.keys(loggedPayload.error).sort(), ['code', 'message', 'status']);
            assert.strictEqual(loggedPayload.error.code, expected.code);
            assert.strictEqual(loggedPayload.error.status, expected.status);
            assert.ok(loggedPayload.error.message.includes(expected.messageContains));
        }

        it('agentLoop throw 경로 — err 의 stack / headers / response / request 제외, code/status/message 만 로깅', async () => {
            const repo = seededRepo();
            const jobService = new JobService(repo, makeAiUsageService());
            const fatErr = makeFatErr();
            const throwingLoop = { async run() { throw fatErr; } };
            const messaging = makeMessaging();
            const userRepo = makeUserRepository(BASE_DEVICE);
            const { errors, logger } = captureLogger();

            const handler = makeHandler({ jobService, agentLoopService: throwingLoop, userRepository: userRepo, messaging, logger });
            await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

            const [msg, payload] = errors[0];
            assert.ok(msg.includes('agentLoop 실패'));
            assertSanitized(payload, { code: 'unauthorized', status: 401, messageContains: 'upstream failed' });
        });

        it('aiUsage record throw 경로 — 동일 sanitize 적용', async () => {
            const repo = seededRepo();
            const jobService = new JobService(repo, makeAiUsageService());
            const agentLoopService = makeAgentLoopService(
                AiJobResult.done('stub done'),
                { inputTokens: 100, outputTokens: 30 }
            );
            const aiUsageService = makeAiUsageService();
            const fatErr = makeFatErr();
            aiUsageService.recordUsage = async () => { throw fatErr; };
            const messaging = makeMessaging();
            const userRepo = makeUserRepository(BASE_DEVICE);
            const { errors, logger } = captureLogger();

            const handler = makeHandler({ jobService, agentLoopService, aiUsageService, userRepository: userRepo, messaging, logger });
            await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

            const recordErr = errors.find(([m]) => m.includes('aiUsage record 실패'));
            assert.ok(recordErr, 'aiUsage record 실패 로그 존재');
            assertSanitized(recordErr[1], { code: 'unauthorized', status: 401, messageContains: 'upstream failed' });
        });

        it('FCM send throw 경로 — 동일 sanitize 적용', async () => {
            const repo = seededRepo();
            const jobService = new JobService(repo, makeAiUsageService());
            const agentLoopService = makeAgentLoopService();
            const fatErr = makeFatErr();
            const failMessaging = { async send() { throw fatErr; } };
            const userRepo = makeUserRepository(BASE_DEVICE);
            const { errors, logger } = captureLogger();

            const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging: failMessaging, logger });
            await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

            const fcmErr = errors.find(([m]) => m.includes('FCM 발송 실패'));
            assert.ok(fcmErr, 'FCM 발송 실패 로그 존재');
            assertSanitized(fcmErr[1], { code: 'unauthorized', status: 401, messageContains: 'upstream failed' });
        });

        it('매우 긴 message 는 길이 캡 적용 후 로깅', async () => {
            const repo = seededRepo();
            const jobService = new JobService(repo, makeAiUsageService());
            const hugeMsg = 'X'.repeat(2000);
            const hugeErr = Object.assign(new Error(hugeMsg), { code: 'huge', status: 500 });
            const throwingLoop = { async run() { throw hugeErr; } };
            const messaging = makeMessaging();
            const userRepo = makeUserRepository(BASE_DEVICE);
            const { errors, logger } = captureLogger();

            const handler = makeHandler({ jobService, agentLoopService: throwingLoop, userRepository: userRepo, messaging, logger });
            await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

            const loggedMsg = errors[0][1].error.message;
            assert.ok(loggedMsg.length < hugeMsg.length, '캡 적용으로 원본보다 짧음');
            assert.ok(loggedMsg.length <= 600, '하드 cap 600자 이하');
        });

        it('non-Error 입력 (string throw) 도 안전 fallback', async () => {
            const repo = seededRepo();
            const jobService = new JobService(repo, makeAiUsageService());
            const throwingLoop = { async run() { throw 'plain string error'; } };
            const messaging = makeMessaging();
            const userRepo = makeUserRepository(BASE_DEVICE);
            const { errors, logger } = captureLogger();

            const handler = makeHandler({ jobService, agentLoopService: throwingLoop, userRepository: userRepo, messaging, logger });
            await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

            const payload = errors[0][1];
            assert.ok(payload.error.message.includes('plain string error'));
            assert.strictEqual(payload.error.code, undefined);
            assert.strictEqual(payload.error.status, undefined);
        });
    });
});
