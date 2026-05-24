'use strict';

const AiUsage = require('../../models/ai/AiUsage');

/**
 * StubAiUsageRepository — aiUsageService 단위 테스트용 인메모리 stub.
 *
 * 인터페이스는 실 구현체(repositories/ai/aiUsageRepository.js)와 동일.
 *
 * Record-only 정책: 검증/throw 로직은 shouldFail* flag 외에는 두지 않는다.
 * 호출 인자는 lastIncrementPayload / allIncrementPayloads 에 raw 로 기록.
 */
class StubAiUsageRepository {

    constructor() {
        /** @type {Map<string, {input_tokens:number, output_tokens:number, updated_at:any}>} key: `${userId}/${dateKey}` */
        this._store = new Map();

        this.shouldFailIncrement = false;
        this.shouldFailLoad = false;

        // recorders
        this.lastIncrementPayload = null;          // { userId, dateKey, tokens }
        this.allIncrementPayloads = [];             // 호출 순서 보존
    }

    _key(userId, dateKey) {
        return `${userId}/${dateKey}`;
    }

    async increment(userId, dateKey, { inputTokens, outputTokens }) {
        if (this.shouldFailIncrement) {
            throw { message: 'stub increment failed' };
        }
        const payload = { userId, dateKey, tokens: { inputTokens, outputTokens } };
        this.lastIncrementPayload = payload;
        this.allIncrementPayloads.push(payload);

        const key = this._key(userId, dateKey);
        const cur = this._store.get(key) || { input_tokens: 0, output_tokens: 0, updated_at: null };
        this._store.set(key, {
            input_tokens: cur.input_tokens + inputTokens,
            output_tokens: cur.output_tokens + outputTokens,
            updated_at: new Date()
        });
    }

    async load(userId, dateKey) {
        if (this.shouldFailLoad) {
            throw { message: 'stub load failed' };
        }
        const data = this._store.get(this._key(userId, dateKey));
        if (!data) return null;
        return AiUsage.fromData(dateKey, data);
    }

    /**
     * 테스트 셋업용 — load 결과를 직접 시드. increment 우회.
     */
    seed(userId, dateKey, { inputTokens, outputTokens, updatedAt = new Date() }) {
        this._store.set(this._key(userId, dateKey), {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            updated_at: updatedAt
        });
    }
}

module.exports = StubAiUsageRepository;
