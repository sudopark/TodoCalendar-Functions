const assert = require('assert');
const AuthorizationCodeService = require('../../../services/oauth/authorizationCodeService');
const { StubAuthorizationCodeRepository } = require('../../doubles/stubOAuthRepositories');

describe('services/oauth/AuthorizationCodeService', () => {

    let repo, svc;

    const VALID = {
        userId: 'user-1',
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:54321/cb',
        codeChallenge: 'pkce-cc',
        codeChallengeMethod: 'S256',
        resource: 'http://localhost:3000/mcp',
        scope: ['read:calendar', 'write:calendar']
    };

    beforeEach(() => {
        repo = new StubAuthorizationCodeRepository();
        svc = new AuthorizationCodeService(repo, 300);
    });

    describe('issue 정상', () => {

        it('AuthorizationCode 반환 + 5분 TTL', async () => {
            const before = Date.now();
            const c = await svc.issue(VALID);
            const after = Date.now();
            assert.ok(c.id);
            assert.strictEqual(c.userId, 'user-1');
            assert.strictEqual(c.clientId, 'client-1');
            assert.deepStrictEqual(c.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(c.used, false);
            assert.ok(c.expiresAt >= before + 300 * 1000);
            assert.ok(c.expiresAt <= after + 300 * 1000);
        });

        it('repository.create payload 에 필수 필드 모두 포함', async () => {
            await svc.issue(VALID);
            const p = repo.lastCreatedPayload;
            assert.strictEqual(p.userId, 'user-1');
            assert.strictEqual(p.codeChallengeMethod, 'S256');
            assert.deepStrictEqual(p.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(p.used, false);
        });
    });

    describe('issue 검증', () => {

        for (const field of ['userId', 'clientId', 'redirectUri', 'codeChallenge', 'codeChallengeMethod', 'resource']) {
            it(`${field} 누락 → 400`, async () => {
                await assert.rejects(
                    () => svc.issue({ ...VALID, [field]: '' }),
                    e => e.status === 400 && e.code === 'InvalidRequest'
                );
            });
        }

        it('scope 빈 배열 → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID, scope: [] }),
                e => e.status === 400
            );
        });

        it('scope null → 400', async () => {
            await assert.rejects(
                () => svc.issue({ ...VALID, scope: null }),
                e => e.status === 400
            );
        });
    });
});
