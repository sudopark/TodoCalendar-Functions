const jwt = require('jsonwebtoken');
const Errors = require('../../models/Errors');

function signedUserAuth(req, res, next) {
    const token = req.headers && req.headers['x-open-user-token'];
    if (typeof token !== 'string' || token.length === 0) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid token');
    }

    const secret = process.env.SIGNING_SECRET;
    if (!secret) {
        throw new Errors.Base(500, 'ServerMisconfigured', 'JWT signing secret not configured');
    }

    let payload;
    try {
        payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (err) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid token');
    }

    if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid token');
    }

    req.openUserId = payload.sub;
    req.openScope = Array.isArray(payload.scope) ? payload.scope : [];
    next();
}

module.exports = signedUserAuth;
