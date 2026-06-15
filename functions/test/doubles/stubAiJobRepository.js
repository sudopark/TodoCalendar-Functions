
'use strict';

const AiJob = require('../../models/ai/AiJob');

/**
 * StubAiJobRepository — jobService / aiController / trigger 단위 테스트용 인메모리 stub.
 *
 * 인터페이스는 실 구현체(repositories/ai/jobRepository.js)와 동일.
 *
 * Record-only 정책: 검증/throw 로직은 shouldFail* flag 외에는 두지 않는다.
 * lastXxx 프로퍼티에 raw 인자를 기록해 두면 테스트 케이스가 직접 assert 한다.
 */
class StubAiJobRepository {

    constructor() {
        /** @type {Map<string, object>} jobId → plain data */
        this._store = new Map();

        // failure flags
        this.shouldFailLoad = false;
        this.shouldFailPut = false;

        // recorders
        this.lastPutPayload = null;       // { jobId, data }
        this.lastTransitionAttempt = null; // jobId (most recent call)
        this.lastRejectAttempt = null;     // jobId (most recent rejectConfirm call)
        this.lastCancelAttempt = null;     // jobId (most recent cancel call)
    }

    /**
     * job 데이터를 Map 에 저장한다.
     * lastPutPayload 에 raw 인자({ jobId, data })를 보관해
     * 테스트에서 Object.getPrototypeOf(data) === Object.prototype 등을 직접 검증 가능.
     *
     * @param {string} jobId
     * @param {object} data — plain object (custom prototype 금지)
     */
    async put(jobId, data) {
        if (this.shouldFailPut) {
            throw { message: 'stub put failed' };
        }
        this.lastPutPayload = { jobId, data };
        this._store.set(jobId, Object.assign({}, data));
    }

    /**
     * jobId 에 해당하는 job 을 AiJob 인스턴스로 반환한다.
     * 없으면 null.
     *
     * @param {string} jobId
     * @returns {Promise<AiJob|null>}
     */
    async load(jobId) {
        if (this.shouldFailLoad) {
            throw { message: 'stub load failed' };
        }
        const data = this._store.get(jobId);
        if (!data) return null;
        return AiJob.fromData(jobId, data);
    }

    /**
     * PENDING → RUNNING 상태 전이 (Compare-And-Swap 시뮬레이션).
     * 현재 status 가 PENDING 이면 RUNNING 으로 갱신하고 true 반환.
     * 아니면 false (이미 RUNNING 이거나 terminal 상태인 경우 포함).
     *
     * lastTransitionAttempt 에 jobId 를 기록한다.
     *
     * @param {string} jobId
     * @returns {Promise<boolean>}
     */
    async transitionToRunning(jobId) {
        this.lastTransitionAttempt = jobId;
        const data = this._store.get(jobId);
        if (!data || data.status !== AiJob.STATUS.PENDING) {
            return false;
        }
        data.status = AiJob.STATUS.RUNNING;
        return true;
    }

    /**
     * RUNNING → 종결 상태(result.type 매핑) 전이.
     * 현재 status 가 RUNNING 이면 전이 + result 저장 후 true 반환.
     * 아니면 false (재진입 / 잘못된 순서 방어).
     *
     * result.type 이 AiJob.STATUS 의 terminal 값(DONE/CONFIRM/FAILED)과 1:1 매핑.
     *
     * @param {string} jobId
     * @param {{ type: 'DONE'|'CONFIRM'|'FAILED', [key: string]: any }} result
     * @returns {Promise<boolean>}
     */
    async completeWith(jobId, result) {
        const data = this._store.get(jobId);
        if (!data || data.status !== AiJob.STATUS.RUNNING) {
            return false;
        }
        data.status = result.type;   // 'DONE' | 'CONFIRM' | 'FAILED'
        data.result = result;
        return true;
    }

    /**
     * CONFIRM → REJECTED 상태 전이 (Compare-And-Swap 시뮬레이션, #243).
     * 현재 status 가 CONFIRM 이면 REJECTED 로 갱신하고 true 반환.
     * 아니면 false (이미 REJECTED 거나 다른 상태 — 멱등 no-op).
     *
     * lastRejectAttempt 에 jobId 를 기록한다.
     *
     * @param {string} jobId
     * @returns {Promise<boolean>}
     */
    async rejectConfirm(jobId) {
        this.lastRejectAttempt = jobId;
        const data = this._store.get(jobId);
        if (!data || data.status !== AiJob.STATUS.CONFIRM) {
            return false;
        }
        data.status = AiJob.STATUS.REJECTED;
        return true;
    }

    /**
     * 사용자 중지 (#250, Compare-And-Swap 시뮬레이션).
     * - PENDING → CANCELED 즉시 전이 (loop 진입 전 종결).
     * - RUNNING → cancelRequested flag 만 set (loop 가 협조적으로 종결).
     * - 그 외(CONFIRM/terminal) → no-op false.
     *
     * lastCancelAttempt 에 jobId 를 기록한다.
     *
     * @param {string} jobId
     * @returns {Promise<boolean>} 전이 또는 flag set 이 실제로 일어났는지 여부
     */
    async cancel(jobId) {
        this.lastCancelAttempt = jobId;
        const data = this._store.get(jobId);
        if (!data) return false;
        if (data.status === AiJob.STATUS.PENDING) {
            data.status = AiJob.STATUS.CANCELED;
            return true;
        }
        if (data.status === AiJob.STATUS.RUNNING) {
            data.cancelRequested = true;
            return true;
        }
        return false;
    }

    /**
     * cancelRequested flag 조회 (#250). RUNNING loop 의 협조적 cancel 체크포인트가 사용.
     *
     * @param {string} jobId
     * @returns {Promise<boolean>}
     */
    async isCancelRequested(jobId) {
        const data = this._store.get(jobId);
        return !!(data && data.cancelRequested === true);
    }
}

module.exports = StubAiJobRepository;
