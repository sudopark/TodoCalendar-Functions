

const { toISOString } = require('./_timestamp');

class AiUsage {
    constructor({ dateKey, inputTokens, outputTokens, updatedAt }) {
        this.dateKey = dateKey;
        this.inputTokens = inputTokens ?? 0;
        this.outputTokens = outputTokens ?? 0;
        this.updatedAt = updatedAt ?? null;
    }

    static fromData(dateKey, data) {
        return new AiUsage({
            dateKey,
            inputTokens: data.input_tokens ?? 0,
            outputTokens: data.output_tokens ?? 0,
            updatedAt: toISOString(data.updated_at)
        });
    }

    /**
     * 오늘 사용량이 아직 없는 사용자 조회 시 service 가 반환하는 빈 인스턴스.
     * caller 가 null 분기 안 하게 만들어 API 응답에 항상 같은 shape 유지.
     */
    static empty(dateKey) {
        return new AiUsage({ dateKey, inputTokens: 0, outputTokens: 0, updatedAt: null });
    }

    toJSON() {
        return {
            date: this.dateKey,
            input_tokens: this.inputTokens,
            output_tokens: this.outputTokens,
            updated_at: this.updatedAt
        };
    }
}

module.exports = AiUsage;
