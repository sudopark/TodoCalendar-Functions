const crypto = require('crypto');
const Errors = require('../../models/Errors');

const KNOWN_SERVICES = ['mcp'];

// env 의 OPENAPI_PAT_<SERVICE>(_PRIMARY|_SECONDARY) 는 '<service>_<secret>' full token 형식
// (lib `todocalendar-tools` 의 callOpenApi 가 Authorization 헤더에 그대로 박는 형식과 일관).
// 두 슬롯(#176: 무중단 로테이션)을 모두 보되, prefix 누락 슬롯은 즉시 폐기. 일치 비교는
// secret 부분만 수행하므로 호출자에 secret 만 추려서 반환.
function envSecretsFor(service) {
    const upper = service.toUpperCase();
    const prefix = `${service}_`;
    const primary = process.env[`OPENAPI_PAT_${upper}_PRIMARY`] ?? process.env[`OPENAPI_PAT_${upper}`];
    const secondary = process.env[`OPENAPI_PAT_${upper}_SECONDARY`];
    return [primary, secondary]
        .filter((s) => typeof s === 'string' && s.startsWith(prefix) && s.length > prefix.length)
        .map((s) => s.slice(prefix.length));
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

    const expectedSecrets = envSecretsFor(service);
    if (expectedSecrets.length === 0) {
        throw new Errors.Base(500, 'ServerMisconfigured', 'PAT secret not configured');
    }

    const matched = expectedSecrets.some((expected) => safeEqual(secret, expected));
    if (!matched) {
        throw new Errors.Base(401, 'InvalidCredentials', 'Invalid credentials');
    }

    req.callerId = service;
    next();
}

module.exports = patAuth;
