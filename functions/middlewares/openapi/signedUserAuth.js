const jwt = require('jsonwebtoken');
const Errors = require('../../models/Errors');

function signingSecrets() {
    const primary = process.env.SIGNING_SECRET_PRIMARY ?? process.env.SIGNING_SECRET;
    const secondary = process.env.SIGNING_SECRET_SECONDARY;
    return [primary, secondary].filter((s) => typeof s === 'string' && s.length > 0);
}

function signedUserAuth(req, res, next) {
    const token = req.headers && req.headers['x-open-user-token'];
    if (typeof token !== 'string' || token.length === 0) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid token');
    }

    const secrets = signingSecrets();
    if (secrets.length === 0) {
        throw new Errors.Base(500, 'ServerMisconfigured', 'JWT signing secret not configured');
    }

    let payload;
    for (const secret of secrets) {
        try {
            payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
            break;
        } catch (_err) {
            // 다음 후보 시도
        }
    }
    if (!payload) {
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
