'use strict';

const AiUsage = require('../../models/ai/AiUsage');
const aiPlans = require('./data/aiPlans.json');

/**
 * MVP — 모든 유저가 free plan. 추후 #166 에서 user → plan resolution 흐름 추가하면
 * 이 상수 대신 user 의 plan id 를 조회한다.
 */
const DEFAULT_PLAN_ID = 'free';

/**
 * 일별 토큰 사용량 record / 조회 정책.
 *
 * - dateKey 는 항상 **server UTC** 기준 'YYYY-MM-DD'.
 *   클라 / 사용자 timezone 과 별개로 한 기준만 유지해 record / 조회의 일관성 보장.
 * - record 는 양수 토큰이 하나라도 있을 때만 호출 — 빈 doc 생성 방지.
 * - getTodayUsage 는 doc 미존재 시 0/0/null 빈 AiUsage 반환 (caller 의 null 분기 제거).
 */
class AiUsageService {

    /**
     * @param {{ repository: object, clock?: () => Date }} deps
     *   clock: 테스트용 주입. 기본 () => new Date().
     */
    constructor({ repository, clock }) {
        this.repository = repository;
        this._clock = clock ?? (() => new Date());
    }

    _todayUtcKey() {
        return this._clock().toISOString().slice(0, 10);
    }

    /**
     * @param {string} userId
     * @param {{ inputTokens: number | null | undefined, outputTokens: number | null | undefined }} tokens
     */
    async recordUsage(userId, { inputTokens, outputTokens }) {
        const input = inputTokens || 0;
        const output = outputTokens || 0;
        if (input === 0 && output === 0) return;

        const dateKey = this._todayUtcKey();
        await this.repository.increment(userId, dateKey, { inputTokens: input, outputTokens: output });
    }

    /**
     * @param {string} userId
     * @returns {Promise<AiUsage>}  doc 미존재 시 빈 AiUsage (0/0/null)
     */
    async getTodayUsage(userId) {
        const dateKey = this._todayUtcKey();
        const usage = await this.repository.load(userId, dateKey);
        return usage ?? AiUsage.empty(dateKey);
    }

    /**
     * 본 user 의 오늘 일일 토큰 한도. plan 별 정의는 `data/aiPlans.json` 에서 조회.
     * MVP 는 모두 free plan — 추후 #166 에서 user → plan resolution 추가.
     *
     * @param {string} _userId
     * @returns {Promise<number>}
     */
    async getDailyLimit(_userId) {
        return aiPlans[DEFAULT_PLAN_ID].dailyLimit;
    }

    /**
     * 본 user 가 오늘 일일 한도를 소진했는지 (input+output 합산 ≥ limit).
     * controller 가 새 명령 진입 시 사전 차단 판단에 사용.
     *
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    async isOverDailyLimit(userId) {
        const [usage, limit] = await Promise.all([
            this.getTodayUsage(userId),
            this.getDailyLimit(userId)
        ]);
        return (usage.inputTokens + usage.outputTokens) >= limit;
    }
}

module.exports = AiUsageService;
