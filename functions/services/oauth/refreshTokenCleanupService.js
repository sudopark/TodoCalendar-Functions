class RefreshTokenCleanupService {

    // expired refresh_token 삭제. revoked grace 정리는 후속(필요 시 별 메소드).
    // beforeTimestamp = now (만료 시점이 현재보다 과거인 것 = 이미 expired)
    constructor(repository, batchLimit = 500) {
        if (!repository) throw new Error('RefreshTokenCleanupService: repository required');
        this.repository = repository;
        this.batchLimit = batchLimit;
    }

    async cleanupExpiredTokens(now = Date.now()) {
        const expired = await this.repository.findExpiredBefore(now, this.batchLimit);
        const deletedIds = [];
        for (const token of expired) {
            await this.repository.deleteById(token.id);
            deletedIds.push(token.id);
        }
        return deletedIds;
    }
}

module.exports = RefreshTokenCleanupService;
