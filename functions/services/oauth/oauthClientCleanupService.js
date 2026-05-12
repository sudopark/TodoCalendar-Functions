const DAY_MS = 24 * 60 * 60 * 1000;

class OAuthClientCleanupService {

    constructor(repository, ageDaysThreshold = 30, batchLimit = 500) {
        if (!repository) throw new Error('OAuthClientCleanupService: repository required');
        this.repository = repository;
        this.ageDaysThreshold = ageDaysThreshold;
        this.batchLimit = batchLimit;
    }

    async cleanupUnusedClients(now = Date.now()) {
        const cutoffMs = now - this.ageDaysThreshold * DAY_MS;
        const candidates = await this.repository.findUnusedBefore(cutoffMs, this.batchLimit);
        const deletedIds = [];
        for (const client of candidates) {
            const ok = await this.repository.deleteIfUnused(client.id, cutoffMs);
            if (ok) deletedIds.push(client.id);
        }
        return deletedIds;
    }
}

module.exports = OAuthClientCleanupService;
