const Errors = require('../../models/Errors');
const logger = require('firebase-functions/logger');

function rateLimit(service) {
    return async function rateLimitMiddleware(req, res, next) {
        let result;
        try {
            result = await service.check({ userId: req.openUserId, patId: req.callerId });
        } catch (err) {
            logger.error('openapi rate limit check failed, failing open', err);
            return next();
        }
        if (!result.allowed) {
            res.set('Retry-After', String(result.retryAfterSec));
            throw new Errors.Base(429, 'RateLimitExceeded', 'Rate limit exceeded');
        }
        next();
    };
}

module.exports = rateLimit;
