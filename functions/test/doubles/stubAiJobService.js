

const AiJob = require('../../models/ai/AiJob');


class StubAiJobService {

    constructor() {
        this.shouldFail = false;
        this.lastCreateJobArgs = null;
        this._jobs = {};
        this._nextJobId = 'job-123';
    }

    seedJob(job) {
        this._jobs[job.jobId] = job;
    }

    async createJob({ userId, deviceId, commandText }) {
        if (this.shouldFail) throw { message: 'service failed' };
        this.lastCreateJobArgs = { userId, deviceId, commandText };
        return this._nextJobId;
    }

    async loadJob(jobId) {
        if (this.shouldFail) throw { message: 'service failed' };
        return this._jobs[jobId] ?? null;
    }
}

module.exports = StubAiJobService;
