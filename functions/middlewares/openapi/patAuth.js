const crypto = require('crypto');
const Errors = require('../../models/Errors');

const KNOWN_SERVICES = ['mcp'];

function envSecretFor(service) {
    return process.env[`OPENAPI_PAT_${service.toUpperCase()}`];
}

function safeEqual(a, b) {
    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

function patAuth(req, res, next) {
    const auth = req.headers && req.headers.authorization;
    if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid credentials');
    }

    const token = auth.slice('Bearer '.length).trim();
    const sep = token.indexOf('_');
    if (sep <= 0 || sep === token.length - 1) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid credentials');
    }

    const service = token.slice(0, sep);
    const secret = token.slice(sep + 1);

    if (!KNOWN_SERVICES.includes(service)) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid credentials');
    }

    const expected = envSecretFor(service);
    if (!expected) {
        throw new Errors.Base(500, 'ServerMisconfigured', 'PAT secret not configured');
    }

    if (!safeEqual(secret, expected)) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid credentials');
    }

    req.callerId = service;
    next();
}

module.exports = patAuth;
