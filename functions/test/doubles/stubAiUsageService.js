'use strict';

const AiUsage = require('../../models/ai/AiUsage');

/**
 * StubAiUsageService — aiController.getUsage 단위 테스트용 인메모리 stub.
 *
 * 인터페이스는 실 구현체(services/ai/aiUsageService.js)와 동일.
 * Record-only 정책: 검증/throw 는 shouldFail* flag 외 두지 않음.
 */
class StubAiUsageService {

    constructor() {
        this._usageByUser = new Map();   // userId → AiUsage
        this._defaultDateKey = '2026-05-22';
        this._dailyLimit = 5000;
        this._resetAt = '2026-05-23T00:00:00.000Z';   // _defaultDateKey 다음 UTC 자정
        this._overByUser = new Map();    // userId → boolean override; 미설정 시 false

        this.shouldFailGetTodayUsage = false;
        this.shouldFailRecordUsage = false;

        // recorders
        this.allRecordCalls = [];
        this.lastRecordCall = null;
        this.lastIsOverDailyLimitUserId = null;
    }

    /**
     * 테스트 셋업용 — getDailyLimit 반환 값을 조정.
     */
    setDailyLimit(limit) {
        this._dailyLimit = limit;
    }

    /**
     * 테스트 셋업용 — isOverDailyLimit 반환 값을 user 별로 override.
     */
    setOverDailyLimit(userId, isOver) {
        this._overByUser.set(userId, isOver);
    }

    /**
     * 테스트 셋업용 — getTodayUsage 결과를 직접 시드.
     */
    seedUsage(userId, { inputTokens, outputTokens, updatedAt = new Date(), dateKey = this._defaultDateKey }) {
        this._usageByUser.set(userId, new AiUsage({
            dateKey,
            inputTokens,
            outputTokens,
            updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt
        }));
    }

    async recordUsage(userId, tokens) {
        if (this.shouldFailRecordUsage) {
            throw { message: 'stub recordUsage failed' };
        }
        const call = { userId, tokens };
        this.allRecordCalls.push(call);
        this.lastRecordCall = call;
    }

    async getTodayUsage(userId) {
        if (this.shouldFailGetTodayUsage) {
            throw { message: 'stub getTodayUsage failed' };
        }
        return this._usageByUser.get(userId) ?? AiUsage.empty(this._defaultDateKey);
    }

    async getDailyLimit(_userId) {
        return this._dailyLimit;
    }

    getResetAt() {
        return this._resetAt;
    }

    async isOverDailyLimit(userId) {
        this.lastIsOverDailyLimitUserId = userId;
        return this._overByUser.get(userId) ?? false;
    }
}

module.exports = StubAiUsageService;
