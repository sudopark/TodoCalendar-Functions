const assert = require('assert');
const RefreshTokenCleanupService = require('../../../services/oauth/refreshTokenCleanupService');
const { StubRefreshTokenRepository } = require('../../doubles/stubOAuthRepositories');

describe('services/oauth/RefreshTokenCleanupService', () => {

    let repo;
    let svc;

    beforeEach(() => {
        repo = new StubRefreshTokenRepository();
        svc = new RefreshTokenCleanupService(repo);
    });

    describe('constructor', () => {

        it('repository 없으면 throw', () => {
            assert.throws(() => new RefreshTokenCleanupService(null), /repository required/);
        });
    });

    describe('cleanupExpiredTokens', () => {

        it('expired token 만 삭제 — valid / revoked-but-not-expired 는 보존', async () => {
            const now = Date.now();
            repo.seed('expired-1', { expiresAt: now - 1000 });
            repo.seed('expired-2', { expiresAt: now - 60000 });
            repo.seed('valid-1', { expiresAt: now + 60000 });
            // revoked 인데 아직 만료 안 됨 — 본 cleanup 범위 외 (별도 grace 정리는 후속)
            repo.seed('revoked-valid', { expiresAt: now + 60000, revokedAt: now - 1000 });

            const deleted = await svc.cleanupExpiredTokens(now);

            assert.strictEqual(deleted.length, 2);
            assert.ok(deleted.includes('expired-1'));
            assert.ok(deleted.includes('expired-2'));
            // valid 와 revoked-but-not-expired 는 store 에 남아있어야
            assert.ok(await repo.findById('valid-1'));
            assert.ok(await repo.findById('revoked-valid'));
        });

        it('아무것도 만료 안 됐으면 빈 배열', async () => {
            const now = Date.now();
            repo.seed('valid-1', { expiresAt: now + 60000 });

            const deleted = await svc.cleanupExpiredTokens(now);

            assert.deepStrictEqual(deleted, []);
        });

        it('repository.deleteById 호출 — spy 로 검증', async () => {
            const now = Date.now();
            repo.seed('exp-1', { expiresAt: now - 1000 });

            await svc.cleanupExpiredTokens(now);

            assert.strictEqual(repo.deleteCalls.length, 1);
            assert.strictEqual(repo.deleteCalls[0].id, 'exp-1');
        });
    });
});
