

const { toISOString } = require('./_timestamp');

class AiJob {
    constructor({ jobId, userId, deviceId, commandText, timezone, mode, confirmPayload, status, result, createdAt, updatedAt, expireAt }) {
        this.jobId = jobId;
        this.userId = userId;
        this.deviceId = deviceId;
        this.commandText = commandText;
        this.timezone = timezone;
        this.mode = mode ?? AiJob.MODE.COMMAND;
        this.confirmPayload = confirmPayload ?? null;
        this.status = status;
        this.result = result ?? null;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.expireAt = expireAt;
    }

    static fromData(jobId, data) {
        // mode / confirmPayload 는 #158 에서 추가됨. 그 이전 doc 은 mode 'command' 로 backward-compatible.
        return new AiJob({
            jobId,
            userId: data.userId,
            deviceId: data.deviceId,
            commandText: data.commandText,
            timezone: data.timezone,
            mode: data.mode ?? AiJob.MODE.COMMAND,
            confirmPayload: data.confirmPayload ?? null,
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
            mode: this.mode,
            confirm_payload: this.confirmPayload,
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

// 'command': 자연어 명령 (1차) — Agent Loop run() 진입
// 'confirm': confirm 2차 호출 — Agent Loop runConfirm() 진입, lib tool 1회 실행
AiJob.MODE = Object.freeze({
    COMMAND: 'command',
    CONFIRM: 'confirm'
});

module.exports = AiJob;
