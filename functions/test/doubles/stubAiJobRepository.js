
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
}

module.exports = StubAiJobRepository;
