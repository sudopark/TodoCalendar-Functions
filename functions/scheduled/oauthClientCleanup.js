const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');

const SCHEDULE_DAYS = parseInt(process.env.OAUTH_CLIENT_CLEANUP_AGE_DAYS ?? '30', 10);

module.exports = onSchedule({
    schedule: 'every 24 hours',
    timeZone: 'Asia/Seoul'
}, async () => {
    // lazy require: 함수 인스턴스 콜드 스타트 시 Firebase Admin SDK 가 이미 init 된 상태에서 평가
    const OAuthClientRepository = require('../repositories/oauth/oauthClientRepository');
    const OAuthClientCleanupService = require('../services/oauth/oauthClientCleanupService');

    const repo = new OAuthClientRepository();
    const svc = new OAuthClientCleanupService(repo, SCHEDULE_DAYS);
    const deleted = await svc.cleanupUnusedClients();
    logger.info(`oauth_client_cleanup: deleted ${deleted.length} unused clients (age > ${SCHEDULE_DAYS}d)`);
});
