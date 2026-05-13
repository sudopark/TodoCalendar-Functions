const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

const SCHEDULE_DAYS = parseInt(process.env.OAUTH_CLIENT_CLEANUP_AGE_DAYS ?? '30', 10);

// production 에선 OAUTH_CLEANUP_SERVICE_ACCOUNT env 로 격리 SA (oauth-cleanup@...) 명시.
// 미설정 (emulator / 로컬 dev) 이면 default runtime SA 사용 (격리 효과 X, dev 전용).
const CLEANUP_SERVICE_ACCOUNT = process.env.OAUTH_CLEANUP_SERVICE_ACCOUNT;

module.exports = onSchedule({
    schedule: 'every 24 hours',
    timeZone: 'Asia/Seoul',
    ...(CLEANUP_SERVICE_ACCOUNT ? { serviceAccount: CLEANUP_SERVICE_ACCOUNT } : {})
}, async () => {
    // lazy require: 함수 인스턴스 콜드 스타트 시 Firebase Admin SDK 가 이미 init 된 상태에서 평가
    const OAuthClientRepository = require('../repositories/oauth/oauthClientRepository');
    const OAuthClientCleanupService = require('../services/oauth/oauthClientCleanupService');

    // cleanup-app named instance 의 firestore — credentials 가 runtime SA 로 격리됨 (issue #194).
    const cleanupDb = getFirestore(getApp('cleanup-app'));
    const repo = new OAuthClientRepository(cleanupDb);
    const svc = new OAuthClientCleanupService(repo, SCHEDULE_DAYS);
    const deleted = await svc.cleanupUnusedClients();
    logger.info(`oauth_client_cleanup: deleted ${deleted.length} unused clients (age > ${SCHEDULE_DAYS}d)`);
});
