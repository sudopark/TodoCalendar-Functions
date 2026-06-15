'use strict';

const crypto = require('crypto');
const AiJob = require('../../models/ai/AiJob');
const AiJobResult = require('../../models/ai/AiJobResult');
const AiErrorCode = require('../../models/ai/AiErrorCode');
const Errors = require('../../models/Errors');

// #157 — 일일 한도 초과 시 user-facing reason. AgentLoopService 의
// MESSAGES.dailyLimitExceeded 와 같은 워딩 (단일 출처가 아니라 양쪽 갱신 시 같이 갱신).
const DAILY_LIMIT_REASON = Object.freeze({
    ko: '오늘 사용 가능한 한도를 모두 사용했어요. 내일 다시 시도해 주세요.',
    en: "You've reached today's usage limit. Please try again tomorrow."
});

class JobService {

    /**
     * @param {object} jobRepository
     * @param {object} aiUsageService — 한도 체크 (`isOverDailyLimit`) 의존성.
     */
    constructor(jobRepository, aiUsageService) {
        this.jobRepository = jobRepository;
        this.aiUsageService = aiUsageService;
    }

    /**
     * 새 job 을 생성하고 jobId 를 반환한다.
     * createdAt / updatedAt 은 jobRepository 가 serverTimestamp 로 채움 — 본 서비스는
     * 시간 필드를 만들지 않음. expireAt 만 24h 후 Date 로 caller 가 결정.
     *
     * #157 — 진입 직후 일일 한도 초과 여부 확인. 초과 시 agent loop 진입 없이
     * 즉시 FAILED-born job (private `_createDailyLimitExceededJob`) 으로 종결시키고
     * 같은 jobId 반환. 호출처 (controller) 는 한도 로직에 무지하게 단일 호출.
     *
     * @param {{ userId: string, deviceId: string, commandText: string, timezone: string, lang: 'ko'|'en' }} params
     * @returns {Promise<string>} jobId
     */
    async createJob({ userId, deviceId, commandText, timezone, lang }) {
        if (await this.aiUsageService.isOverDailyLimit(userId)) {
            return this._createDailyLimitExceededJob({ userId, deviceId, commandText, timezone, lang });
        }

        const jobId = crypto.randomUUID();
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const data = {
            userId,
            deviceId,
            commandText,
            timezone,
            lang: lang ?? 'en',
            mode: AiJob.MODE.COMMAND,
            confirmPayload: null,
            status: AiJob.STATUS.PENDING,
            result: null,
            expireAt
        };

        await this.jobRepository.put(jobId, data);
        return jobId;
    }

    /**
     * CONFIRM 2차 호출용 job 발행. 새 jobId 발급 — 1차 jobId 와 독립.
     *
     * #238 — parentJobId 로 1차 command job 을 load 해 그 commandText 를 confirm job 의
     * commandText 로 복사한다. 클라가 confirm job 만 단독으로 봐도 "원래 어떤 자연어
     * 명령이었는지" `command_text` 필드 하나로 파악 가능 (mode 별 분기 불필요).
     * confirmToken payload 에 jobId 가 bind 되지 않아 클라가 parent 를 명시.
     *
     * - parent 미존재 → NotFound
     * - parent.userId !== userId → 403 (다른 user 의 jobId 박는 거 차단)
     *
     * lang 결정은 Accept-Language 헤더 → controller. 응답 메시지 워딩에 그것만 사용.
     *
     * 일일 한도 적용 X (#157) — 1차 confirm 흐름 보호 + tool 1회라 토큰 낮음.
     *
     * @param {{ userId, deviceId, parentJobId, timezone, lang, confirmPayload: { tool, args, confirmToken } }} params
     * @returns {Promise<string>} jobId
     */
    async createConfirmJob({ userId, deviceId, parentJobId, timezone, lang, confirmPayload }) {
        const parent = await this.jobRepository.load(parentJobId);
        if (!parent) {
            throw new Errors.NotFound('parent job not found');
        }
        if (parent.userId !== userId) {
            throw new Errors.Base(403, 'Forbidden', 'forbidden');
        }

        const jobId = crypto.randomUUID();
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const data = {
            userId,
            deviceId,
            commandText: parent.commandText,
            timezone,
            lang: lang ?? 'en',
            mode: AiJob.MODE.CONFIRM,
            confirmPayload,
            status: AiJob.STATUS.PENDING,
            result: null,
            expireAt
        };

        await this.jobRepository.put(jobId, data);
        return jobId;
    }

    /**
     * #157 — 일일 토큰 한도 초과로 인한 사전 차단용 atomic FAILED-born job 생성.
     * createJob 내부 분기에서만 호출 (private).
     *
     * createJob → transitionToRunning → completeWith 3-step 은 Firestore onCreate trigger 와
     * 의 race 에서 trigger 가 transitionToRunning 을 먼저 선점하면 agent loop 진입 →
     * Anthropic 호출 비용 낭비. status=FAILED 로 born 시키면 trigger 의 transition CAS 가
     * 즉시 false → silent return → agent loop 진입 차단 보장.
     *
     * errorCode 는 본 메서드가 박는 (`AiErrorCode.DailyLimitExceeded`) — 한도초과 용도
     * 단일 출처. reason 도 lang 따라 본 메서드가 결정.
     *
     * @param {{ userId, deviceId, commandText, timezone, lang }} params
     * @returns {Promise<string>} jobId
     */
    async _createDailyLimitExceededJob({ userId, deviceId, commandText, timezone, lang }) {
        const jobId = crypto.randomUUID();
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const langKey = lang ?? 'en';
        const reason = DAILY_LIMIT_REASON[langKey] ?? DAILY_LIMIT_REASON.en;
        const result = AiJobResult.failed(reason, undefined, undefined, AiErrorCode.DailyLimitExceeded);

        const data = {
            userId,
            deviceId,
            commandText,
            timezone,
            lang: langKey,
            mode: AiJob.MODE.COMMAND,
            confirmPayload: null,
            status: AiJob.STATUS.FAILED,
            result,
            expireAt
        };

        await this.jobRepository.put(jobId, data);
        return jobId;
    }

    /**
     * jobId 로 job 을 로드한다. 없으면 null.
     *
     * @param {string} jobId
     * @returns {Promise<AiJob|null>}
     */
    async loadJob(jobId) {
        return this.jobRepository.load(jobId);
    }

    /**
     * PENDING → RUNNING 상태 전이 (CAS).
     *
     * @param {string} jobId
     * @returns {Promise<boolean>} 전이 성공 여부
     */
    async transitionToRunning(jobId) {
        return this.jobRepository.transitionToRunning(jobId);
    }

    /**
     * RUNNING → 종결 상태 전이.
     *
     * @param {string} jobId
     * @param {{ type: 'DONE'|'CONFIRM'|'FAILED', [key: string]: any }} result
     * @returns {Promise<boolean>} 전이 성공 여부
     */
    async completeWith(jobId, result) {
        return this.jobRepository.completeWith(jobId, result);
    }

    /**
     * #243 — confirm 대기(CONFIRM) job 을 사용자 미동의(거부)로 종결.
     *
     * confirm 2차 호출(createConfirmJob)의 거부 짝. 데이터 mutation·토큰 검증 없이
     * 1차 command job 의 status 만 CONFIRM → REJECTED 로 전이(CAS). 새 job 을 만들지
     * 않고 기존 job 을 종결 — `result`(거부된 action 포함)는 그대로 보존해 무엇을
     * 거부했는지 히스토리로 남긴다.
     *
     * - job 미존재 → NotFound
     * - job.userId !== userId → 403 (타인 job 거부 차단)
     *
     * 멱등성: CONFIRM 이 아닌 상태(이미 REJECTED / DONE / FAILED 등)면 전이 없이 false.
     * 클라가 fire-and-forget 으로 호출하므로 중복·경합 호출도 throw 없이 안전.
     *
     * @param {{ userId: string, jobId: string }} params
     * @returns {Promise<boolean>} CONFIRM → REJECTED 전이가 실제로 일어났는지 여부
     */
    async rejectConfirm({ userId, jobId }) {
        const job = await this.jobRepository.load(jobId);
        if (!job) {
            throw new Errors.NotFound('job not found');
        }
        if (job.userId !== userId) {
            throw new Errors.Base(403, 'Forbidden', 'forbidden');
        }
        return this.jobRepository.rejectConfirm(jobId);
    }

    /**
     * #250 — 진행 중인 작업을 사용자가 중지. rejectConfirm(confirm 거부)과 동선이 다른
     * 별개 액션 — 대상은 아직 진행 중인 PENDING/RUNNING job.
     *
     * 상태별 처리는 repository.cancel 이 atomic 하게 분기:
     * - PENDING → CANCELED 즉시 전이 (trigger 의 transitionToRunning CAS 가 false 가 돼
     *   agent loop 진입 차단).
     * - RUNNING → cancelRequested flag 만 set. status 는 직접 건드리지 않고, loop 가 턴
     *   사이 isCancelRequested 를 보고 협조적으로 CANCELED 로 종결 (중지 시점까지의 부분
     *   mutation 은 result 에 보존).
     * - CONFIRM / terminal → no-op false.
     *
     * - job 미존재 → NotFound
     * - job.userId !== userId → 403 (타인 job 중지 차단)
     *
     * 멱등성: 이미 CANCELED / terminal 이면 전이 없이 false. 클라가 fire-and-forget 으로
     * 호출하므로 중복·경합 호출도 throw 없이 안전.
     *
     * @param {{ userId: string, jobId: string }} params
     * @returns {Promise<boolean>} 전이 또는 cancelRequested set 이 실제로 일어났는지 여부
     */
    async cancel({ userId, jobId }) {
        const job = await this.jobRepository.load(jobId);
        if (!job) {
            throw new Errors.NotFound('job not found');
        }
        if (job.userId !== userId) {
            throw new Errors.Base(403, 'Forbidden', 'forbidden');
        }
        return this.jobRepository.cancel(jobId);
    }

    /**
     * #250 — RUNNING job 에 cancelRequested flag 가 세워졌는지 조회.
     * agent loop 의 협조적 cancel 체크포인트(턴 사이)가 호출.
     *
     * @param {string} jobId
     * @returns {Promise<boolean>}
     */
    async isCancelRequested(jobId) {
        return this.jobRepository.isCancelRequested(jobId);
    }
}

module.exports = JobService;
