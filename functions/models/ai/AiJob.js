

const { toISOString } = require('./_timestamp');

class AiJob {
    constructor({ jobId, userId, deviceId, commandText, timezone, lang, mode, confirmPayload, status, result, createdAt, updatedAt, expireAt }) {
        this.jobId = jobId;
        this.userId = userId;
        this.deviceId = deviceId;
        this.commandText = commandText;
        this.timezone = timezone;
        this.lang = lang ?? 'en';
        this.mode = mode ?? AiJob.MODE.COMMAND;
        this.confirmPayload = confirmPayload ?? null;
        this.status = status;
        this.result = result ?? null;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.expireAt = expireAt;
    }

    static fromData(jobId, data) {
        // mode / confirmPayload 는 #158 에서 추가됨. lang 은 #230 에서 추가됨.
        // 그 이전 doc 은 backward-compatible default (mode='command', lang='en').
        return new AiJob({
            jobId,
            userId: data.userId,
            deviceId: data.deviceId,
            commandText: data.commandText,
            timezone: data.timezone,
            lang: data.lang ?? 'en',
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
            lang: this.lang,
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
               status === AiJob.STATUS.FAILED ||
               status === AiJob.STATUS.REJECTED ||
               status === AiJob.STATUS.CANCELED;
    }
}

// REJECTED: confirm 대기(CONFIRM) job 을 사용자가 미동의(거부)로 종결시킨 상태 (#243).
//           confirm 2차 호출(processConfirmCommand) 의 거부 짝 — 데이터 mutation 없음.
// CANCELED: 진행 중인 작업을 사용자가 중지시킨 상태 (#250). PENDING 이면 loop 진입 전
//           즉시 종결, RUNNING 이면 loop 가 턴 사이 cancelRequested 를 보고 협조적 종결.
//           REJECTED(confirm 거부)와 동선이 다른 별개 상태 — 중지 시점까지 일어난
//           부분 mutation 은 result 에 보존(롤백 X).
AiJob.STATUS = Object.freeze({
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    DONE: 'DONE',
    CONFIRM: 'CONFIRM',
    FAILED: 'FAILED',
    REJECTED: 'REJECTED',
    CANCELED: 'CANCELED'
});

// 'command': 자연어 명령 (1차) — Agent Loop run() 진입
// 'confirm': confirm 2차 호출 — Agent Loop runConfirm() 진입, lib tool 1회 실행
AiJob.MODE = Object.freeze({
    COMMAND: 'command',
    CONFIRM: 'confirm'
});

module.exports = AiJob;
