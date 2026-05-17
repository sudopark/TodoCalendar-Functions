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
    commandText: 'hello',
    status: AiJob.STATUS.PENDING,
    result: null,
    expireAt: new Date(Date.now() + 86400_000)
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

function makeAgentLoopService(resultOverride) {
    return {
        async run(_commandText) {
            return resultOverride ?? AiJobResult.done('stub done');
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

function makeHandler({ jobService, agentLoopService, userRepository, messaging, logger }) {
    return new AgentLoopHandler({ jobService, agentLoopService, userRepository, messaging, logger });
}

// ── cases ─────────────────────────────────────────────────────────────────────

describe('AgentLoopHandler', () => {

    it('정상 발화 — result.notification 없을 때 fallback DONE 카피로 FCM 발송', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo);
        const agentLoopService = makeAgentLoopService(AiJobResult.done('stub done')); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1, 'FCM send 1회');
        const payload = messaging.lastSendPayload;
        assert.strictEqual(payload.token, BASE_DEVICE.pushToken);
        assert.strictEqual(payload.notification.title, FALLBACK_NOTIFICATION.DONE.title);
        assert.strictEqual(payload.notification.body, FALLBACK_NOTIFICATION.DONE.body);
        assert.strictEqual(payload.data.jobId, 'job-1');
        assert.strictEqual(payload.data.status, 'DONE');
    });

    it('정상 발화 — result.notification 있으면 그 값으로 FCM 발송', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo);
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
        const jobService = new JobService(repo);
        let runCalled = 0;
        const agentLoopService = {
            async run() { runCalled += 1; return AiJobResult.done('x'); }
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
        const jobService = new JobService(repo);
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
        const jobService = new JobService(repo);
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
        const jobService = new JobService(repo);
        const agentLoopService = makeAgentLoopService(AiJobResult.confirm('stub confirm', { stub: true })); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.CONFIRM.title);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'CONFIRM');
    });

    it('result.type 이 FAILED 일 때 FCM 에 fallback FAILED 카피 사용', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo);
        const agentLoopService = makeAgentLoopService(AiJobResult.failed('stub failed')); // no notification
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.FAILED.title);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'FAILED');
    });

    it('result.notification 의 title 이 빈 문자열이면 hasNotification false → fallback 사용', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo);
        const partialNotification = { title: '', body: '본문은 있음' };
        const agentLoopService = makeAgentLoopService(AiJobResult.done('stub done', partialNotification));
        const messaging = makeMessaging();
        const userRepo = makeUserRepository(BASE_DEVICE);
        const { logger } = captureLogger();

        const handler = makeHandler({ jobService, agentLoopService, userRepository: userRepo, messaging, logger });
        await handler.handle(makeEvent('job-1', BASE_JOB_DATA));

        assert.strictEqual(messaging.sendCalled, 1);
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.DONE.title);
    });

    it('FCM 발송 중 네트워크 오류로 throw 가 발생해도 핸들러는 정상 종료', async () => {
        const repo = seededRepo();
        const jobService = new JobService(repo);
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
        const jobService = new JobService(repo);
        const throwingLoop = {
            async run(_commandText) { throw new Error('claude api timeout'); }
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
        assert.strictEqual(messaging.lastSendPayload.notification.title, FALLBACK_NOTIFICATION.FAILED.title);
        assert.strictEqual(messaging.lastSendPayload.data.status, 'FAILED');

        assert.ok(errors.length > 0, 'agentLoop 실패 error 로그');
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
});
