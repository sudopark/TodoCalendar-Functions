'use strict';

const crypto = require('crypto');
const AiJob = require('../../models/ai/AiJob');

class JobService {

    constructor(jobRepository) {
        this.jobRepository = jobRepository;
    }

    /**
     * 새 job 을 생성하고 jobId 를 반환한다.
     * createdAt / updatedAt 은 jobRepository 가 serverTimestamp 로 채움 — 본 서비스는
     * 시간 필드를 만들지 않음. expireAt 만 24h 후 Date 로 caller 가 결정.
     *
     * @param {{ userId: string, deviceId: string, commandText: string }} params
     * @returns {Promise<string>} jobId
     */
    async createJob({ userId, deviceId, commandText }) {
        const jobId = crypto.randomUUID();
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const data = {
            userId,
            deviceId,
            commandText,
            status: AiJob.STATUS.PENDING,
            result: null,
            expireAt
        };

        await this.jobRepository.put(jobId, data);
        return jobId;
    }

    /**
     * jobId 로 job 을 로드한다. 없으면 null.
     *
     * @param {string} jobId
     * @returns {Promise<AiJob|null>}
     */
    async loadJob(jobId) {
        return this.jobRepository.load(jobId);
    }

    /**
     * PENDING → RUNNING 상태 전이 (CAS).
     *
     * @param {string} jobId
     * @returns {Promise<boolean>} 전이 성공 여부
     */
    async transitionToRunning(jobId) {
        return this.jobRepository.transitionToRunning(jobId);
    }

    /**
     * RUNNING → 종결 상태 전이.
     *
     * @param {string} jobId
     * @param {{ type: 'DONE'|'CONFIRM'|'FAILED', [key: string]: any }} result
     * @returns {Promise<boolean>} 전이 성공 여부
     */
    async completeWith(jobId, result) {
        return this.jobRepository.completeWith(jobId, result);
    }
}

module.exports = JobService;
