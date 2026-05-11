const Errors = require('../../models/Errors');

function ipRateLimit({ windowSeconds, max, repository, getIp }) {
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
        throw new Error('ipRateLimit: windowSeconds must be a positive number');
    }
    if (!Number.isFinite(max) || max <= 0) {
        throw new Error('ipRateLimit: max must be a positive number');
    }
    if (!repository || typeof repository.incrementWithinWindow !== 'function') {
        throw new Error('ipRateLimit: repository must implement incrementWithinWindow');
    }

    return async function ipRateLimitMiddleware(req, res, next) {
        const ip = (getIp ? getIp(req) : (req.ip ?? req.connection?.remoteAddress)) ?? 'unknown';
        const count = await repository.incrementWithinWindow(ip, windowSeconds);
        if (count > max) {
            throw new Errors.Base(429, 'TooManyRequests', 'Rate limit exceeded');
        }
        next();
    };
}

module.exports = ipRateLimit;
