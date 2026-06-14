const logger = require('firebase-functions/logger');

const DEFAULT_TTL_MS = 60000;

class OpenRateLimitConfigProvider {

    constructor({ repository, ttlMs = DEFAULT_TTL_MS, now = () => Date.now() }) {
        this.repository = repository;
        this.ttlMs = ttlMs;
        this.now = now;
        this.cache = null;
        this.cachedAt = 0;
    }

    async get() {
        const t = this.now();
        if (this.cache && (t - this.cachedAt) < this.ttlMs) {
            return this.cache;
        }
        try {
            const raw = await this.repository.load();
            this.cache = {
                userUnlimited: new Set(raw.userUnlimited),
                userOverrides: new Map(Object.entries(raw.userOverrides))
            };
            this.cachedAt = t;
            return this.cache;
        } catch (err) {
            logger.error('openapi rate limit config load failed', err);
            if (this.cache) {
                return this.cache;
            }
            return { userUnlimited: new Set(), userOverrides: new Map() };
        }
    }
}

module.exports = OpenRateLimitConfigProvider;
