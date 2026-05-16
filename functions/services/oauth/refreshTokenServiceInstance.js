// Process-level singleton — tokenRoutes / revocationRoutes / 향후 cleanup scheduler 가 같은 instance 공유.
// CommonJS module cache 가 자동 dedup. tokenSigningServiceInstance 와 같은 패턴.
// 향후 service 에 in-memory state (audit log buffer 등) 가 들어가도 안전.

const RefreshTokenRepository = require('../../repositories/oauth/refreshTokenRepository');
const RefreshTokenService = require('../../services/oauth/refreshTokenService');

const repository = new RefreshTokenRepository();
module.exports = new RefreshTokenService(repository);   // default TTL = 30일
