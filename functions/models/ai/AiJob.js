

const { toISOString } = require('./_timestamp');

class AiJob {
    constructor({ jobId, userId, deviceId, commandText, timezone, status, result, createdAt, updatedAt, expireAt }) {
        this.jobId = jobId;
        this.userId = userId;
        this.deviceId = deviceId;
        this.commandText = commandText;
        this.timezone = timezone;
        this.status = status;
        this.result = result ?? null;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.expireAt = expireAt;
    }

    static fromData(jobId, data) {
        return new AiJob({
            jobId,
            userId: data.userId,
            deviceId: data.deviceId,
            commandText: data.commandText,
            timezone: data.timezone,
            status: data.status,
            result: data.result ?? null,
            createdAt: toISOString(data.createdAt),
            updatedAt: toISOString(data.updatedAt),
            expireAt: toISOString(data.expireAt)
        });
    }

    toJSON() {
        return {
            job_id: this.jobId,
            user_id: this.userId,
            device_id: this.deviceId,
            command_text: this.commandText,
            timezone: this.timezone,
            status: this.status,
            result: this.result,
            created_at: this.createdAt,
            updated_at: this.updatedAt
            // expireAt 은 내부 운영 필드 — 외부 응답에 노출 X
        };
    }

    /**
     * 상태 머신 종료 여부 판별.
     * DONE / CONFIRM / FAILED 는 terminal — 이후 상태 전이 없음.
     * jobService 와 trigger 가 polling 종료 조건으로 사용.
     *
     * @param {string} status
     * @returns {boolean}
     */
    static isTerminal(status) {
        return status === AiJob.STATUS.DONE ||
               status === AiJob.STATUS.CONFIRM ||
               status === AiJob.STATUS.FAILED;
    }
}

AiJob.STATUS = Object.freeze({
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    DONE: 'DONE',
    CONFIRM: 'CONFIRM',
    FAILED: 'FAILED'
});

module.exports = AiJob;
