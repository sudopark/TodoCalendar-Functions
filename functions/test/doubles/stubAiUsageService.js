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

        this.shouldFailGetTodayUsage = false;
        this.shouldFailRecordUsage = false;

        // recorders
        this.allRecordCalls = [];
        this.lastRecordCall = null;
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
}

module.exports = StubAiUsageService;
