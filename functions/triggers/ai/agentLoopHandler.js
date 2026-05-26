'use strict';

const defaultLogger = require('firebase-functions/logger');
const AiJob = require('../../models/ai/AiJob');
const AiJobResult = require('../../models/ai/AiJobResult');

// Cloud Logging sanitize (#160). err 를 그대로 logger.error 2nd arg 에 박으면
// Anthropic SDK / firebase-admin / Firestore 에러의 stack, response headers,
// request body, 우발적 secret 이 함께 박힌다. code/status/message 만 추출하고
// message 는 캡을 둬 response body echo 가 통째로 들어오는 경우 차단.
const ERROR_MESSAGE_CAP = 600;
function _summarizeError(err) {
    if (err && typeof err === 'object') {
        const message = typeof err.message === 'string' ? err.message : String(err);
        return {
            code: err.code,
            status: err.status,
            message: message.length > ERROR_MESSAGE_CAP ? message.slice(0, ERROR_MESSAGE_CAP) : message
        };
    }
    const fallback = String(err);
    return {
        code: undefined,
        status: undefined,
        message: fallback.length > ERROR_MESSAGE_CAP ? fallback.slice(0, ERROR_MESSAGE_CAP) : fallback
    };
}

// status 별 fallback notification — result.notification 이 비어 있을 때 사용.
// Agent Loop 이 컨텍스트 기반 맞춤 메시지를 못 만들 때만 진입하는 path.
// 언어는 job.lang (Accept-Language 헤더에서 controller 가 결정 → Firestore 저장).
// 다른 모듈에서 재사용 의도 없음 — handler 내부 private 상수.
const FALLBACK_NOTIFICATION = Object.freeze({
    ko: Object.freeze({
        DONE: Object.freeze({ title: 'AI 작업이 완료됐어요', body: '탭해서 결과를 확인해 주세요' }),
        CONFIRM: Object.freeze({ title: '확인이 필요해요', body: '작업 전 확인이 필요해요' }),
        FAILED: Object.freeze({ title: '처리에 실패했어요', body: '탭해서 자세히 확인해 주세요' })
    }),
    en: Object.freeze({
        DONE: Object.freeze({ title: 'AI command completed', body: 'Tap to view the result' }),
        CONFIRM: Object.freeze({ title: 'Confirmation required', body: 'Please confirm before proceeding' }),
        FAILED: Object.freeze({ title: 'AI command failed', body: 'Tap to view the result' })
    })
});

// agentLoop throw 시 user-facing reason. AgentLoopService 의 MESSAGES.agentError 와 같은 워딩.
const AGENT_LOOP_ERROR_MESSAGE = Object.freeze({
    ko: '처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
    en: 'An error occurred. Please try again later.'
});

class AgentLoopHandler {

    /**
     * @param {{
     *   jobService: import('../../services/ai/jobService'),
     *   agentLoopService: {
     *     run(commandText, opts): Promise<{ result: object, usage: { inputTokens: number, outputTokens: number } }>,
     *     runConfirm(payload, opts): Promise<{ result: object, usage: { inputTokens: number, outputTokens: number } }>
     *   },
     *   aiUsageService: { recordUsage(userId, tokens): Promise<void> },
     *   userRepository: { loadUserDevice(deviceId: string): Promise<object|null> },
     *   messaging: { send(message: object): Promise<any> },
     *   logger?: object
     * }} deps
     */
    constructor({ jobService, agentLoopService, aiUsageService, userRepository, messaging, logger }) {
        this.jobService = jobService;
        this.agentLoopService = agentLoopService;
        this.aiUsageService = aiUsageService;
        this.userRepository = userRepository;
        this.messaging = messaging;
        this.log = logger ?? defaultLogger;
    }

    async handle(event) {
        const jobId = event.params.jobId;
        const rawData = event.data.data();
        const job = AiJob.fromData(jobId, rawData);

        // at-least-once 대응 — PENDING 이 아니면 (이미 RUNNING 이거나 종결) 즉시 반환
        const acquired = await this.jobService.transitionToRunning(jobId);
        if (!acquired) return;

        // agentLoopService.run 이 throw 하면 job 이 RUNNING 에 영구 고착됨
        // (다음 trigger 발화도 transition CAS 가 false 라 skip). 반드시 catch 해서
        // FAILED 결과로 종결시켜야 함. #154 의 실제 Agent Loop 이 Claude API /
        // MCP 호출 실패 시 throw 할 수 있음 — 본 stub 단계부터 인터페이스 잠금.
        let result;
        let usage = null;
        try {
            ({ result, usage } = await this._dispatchAgentLoop(job));
        } catch (err) {
            this.log.error('AI trigger — agentLoop 실패', { jobId, error: _summarizeError(err) });
            // user-facing reason 은 워싱된 lang-aware 텍스트. errorCode 로 분류 정보 보존.
            const lang = job.lang ?? 'en';
            result = AiJobResult.failed(AGENT_LOOP_ERROR_MESSAGE[lang] ?? AGENT_LOOP_ERROR_MESSAGE.en, undefined, undefined, 'agent_loop_throw');
            // throw 경로는 usage 추출 불가 — 부분 사용 토큰이 있어도 손실 (acceptable loss).
            // 정밀도 필요 시 service 가 throw 대신 partial usage 동봉한 error 객체로 전환 필요.
        }

        // 일별 사용량 record — completeWith / FCM 흐름과 독립. record 실패가 후속 단계를
        // 막지 않도록 try/catch 로 격리. usage 가 0/0 이면 service 가 no-op.
        if (usage) {
            await this._recordUsage(job.userId, usage, jobId);
        }

        // completeWith false = 외부 process 가 이미 종결시킨 race. 우리가 만든 result 가
        // 저장되지 않은 상태로 FCM 만 발송하면 클라가 보는 DB 상태와 알림이 엇갈림.
        // RUNNING 가드 실패하면 발송 skip.
        const completed = await this.jobService.completeWith(jobId, result);
        if (!completed) {
            this.log.warn('AI trigger — completeWith 가드 실패 (외부 race), FCM skip', { jobId });
            return;
        }

        await this._sendFcm(job, result);
    }

    // job.mode 에 따라 agentLoopService 의 run 또는 runConfirm 호출.
    // 두 메서드 시그니처가 다르므로 dispatch 책임을 한 곳에 응집.
    async _dispatchAgentLoop(job) {
        if (job.mode === AiJob.MODE.CONFIRM) {
            return this.agentLoopService.runConfirm(job.confirmPayload, {
                userId: job.userId,
                lang: job.lang
            });
        }
        return this.agentLoopService.run(job.commandText, {
            userId: job.userId,
            timezone: job.timezone,
            lang: job.lang
        });
    }

    async _recordUsage(userId, usage, jobId) {
        try {
            await this.aiUsageService.recordUsage(userId, usage);
        } catch (err) {
            this.log.error('AI trigger — aiUsage record 실패', { jobId, error: _summarizeError(err) });
        }
    }

    // _sendFcm — 보안 가드:
    // (1) device 미존재 (사용자 로그아웃 / 기기 해지) → skip.
    // (2) device.userId !== job.userId — 같은 deviceId 가 다른 사용자에게
    //     재할당된 케이스. 본 가드 없이 발송하면 다른 유저 기기로 결과 메시지가
    //     누출됨. 절대 제거하지 말 것.
    async _sendFcm(job, result) {
        const device = await this.userRepository.loadUserDevice(job.deviceId);
        if (!device) {
            this.log.warn('AI trigger — device 없음', { jobId: job.jobId, deviceId: job.deviceId });
            return;
        }
        if (device.userId !== job.userId) {
            this.log.warn('AI trigger — device.userId 불일치 (기기 재할당 가능성)', {
                jobId: job.jobId,
                jobUserId: job.userId,
                deviceUserId: device.userId
            });
            return;
        }

        const lang = job.lang ?? 'en';
        const notification = AiJobResult.hasNotification(result)
            ? result.notification
            : FALLBACK_NOTIFICATION[lang]?.[result.type] ?? FALLBACK_NOTIFICATION.en[result.type];

        if (!notification) {
            this.log.warn('AI trigger — notification 없음 (알 수 없는 status)', { jobId: job.jobId, status: result.type });
            return;
        }

        try {
            await this.messaging.send({
                token: device.pushToken,
                notification: { title: notification.title, body: notification.body },
                data: { jobId: job.jobId, status: result.type }
            });
        } catch (err) {
            this.log.error('AI trigger — FCM 발송 실패', { jobId: job.jobId, error: _summarizeError(err) });
        }
    }
}

module.exports = AgentLoopHandler;
module.exports.FALLBACK_NOTIFICATION = FALLBACK_NOTIFICATION;
