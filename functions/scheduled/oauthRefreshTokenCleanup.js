const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');

module.exports = onSchedule({
    schedule: 'every 24 hours',
    timeZone: 'Asia/Seoul'
}, async () => {
    // lazy require: 함수 인스턴스 콜드 스타트 시 Firebase Admin SDK 가 이미 init 된 상태에서 평가
    const RefreshTokenRepository = require('../repositories/oauth/refreshTokenRepository');
    const RefreshTokenCleanupService = require('../services/oauth/refreshTokenCleanupService');

    const repo = new RefreshTokenRepository();
    const svc = new RefreshTokenCleanupService(repo);
    const deleted = await svc.cleanupExpiredTokens();
    logger.info(`oauth_refresh_token_cleanup: deleted ${deleted.length} expired refresh tokens`);
});
