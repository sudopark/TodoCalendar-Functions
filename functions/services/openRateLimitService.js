const DEFAULT_WINDOW_SECONDS = 60;

class OpenRateLimitService {

    constructor({ repository, configProvider, userPerMin, patPerMin, unlimitedPats, windowSeconds = DEFAULT_WINDOW_SECONDS }) {
        this.repository = repository;
        this.configProvider = configProvider;
        this.userPerMin = userPerMin;
        this.patPerMin = patPerMin;
        this.unlimitedPats = unlimitedPats ?? [];
        this.windowSeconds = windowSeconds;
    }

    _retryAfterSec() {
        return this.windowSeconds - Math.floor((Date.now() / 1000) % this.windowSeconds);
    }

    async check({ userId, patId }) {
        const config = await this.configProvider.get();

        if (!config.userUnlimited.has(userId)) {
            const limit = config.userOverrides.get(userId) ?? this.userPerMin;
            const userCount = await this.repository.incrementWithinWindow('users', userId, this.windowSeconds);
            if (userCount > limit) {
                return { allowed: false, retryAfterSec: this._retryAfterSec() };
            }
        }

        if (!this.unlimitedPats.includes(patId)) {
            const patCount = await this.repository.incrementWithinWindow('pats', patId, this.windowSeconds);
            if (patCount > this.patPerMin) {
                return { allowed: false, retryAfterSec: this._retryAfterSec() };
            }
        }

        return { allowed: true };
    }
}

module.exports = OpenRateLimitService;
