// Process-level singleton — wellKnown / token / 향후 RS 검증 entry 가 같은 instance 공유.
// CommonJS module cache 가 자동 dedup. require 시점에 env 검증 throw (production fast-fail).

const TokenSigningService = require('./tokenSigningService');

module.exports = new TokenSigningService(
    process.env.OAUTH_SIGNING_PRIVATE_KEY,
    process.env.OAUTH_SIGNING_PUBLIC_KEY,
    process.env.OAUTH_ISSUER
);
