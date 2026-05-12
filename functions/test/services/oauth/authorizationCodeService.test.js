const assert = require('assert');
const crypto = require('crypto');
const AuthorizationCodeService = require('../../../services/oauth/authorizationCodeService');
const { StubAuthorizationCodeRepository } = require('../../doubles/stubOAuthRepositories');

function pkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

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

    describe('exchange', () => {

        let v, c, code;

        beforeEach(async () => {
            ({ verifier: v, challenge: c } = pkce());
            // 정상 코드 발급
            const issued = await svc.issue({
                ...VALID,
                codeChallenge: c
            });
            code = issued.id;
        });

        it('정상 → { userId, clientId, resource, scope } 반환', async () => {
            const result = await svc.exchange({
                code,
                codeVerifier: v,
                redirectUri: VALID.redirectUri,
                clientId: VALID.clientId,
                resource: VALID.resource
            });
            assert.deepStrictEqual(result, {
                userId: VALID.userId,
                clientId: VALID.clientId,
                resource: VALID.resource,
                scope: VALID.scope
            });
            const after = await repo.findById(code);
            assert.strictEqual(after.used, true);
        });

        it('code 누락 → 400 InvalidGrant', async () => {
            await assert.rejects(
                () => svc.exchange({ code: '', codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('code not found → 400 InvalidGrant', async () => {
            await assert.rejects(
                () => svc.exchange({ code: 'unknown', codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('code expired → 400 InvalidGrant', async () => {
            const data = repo.store.get(code);
            data.expiresAt = Date.now() - 1000;
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('code 이미 used → 400 InvalidGrant', async () => {
            await repo.markUsed(code);
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('code_verifier 불일치 → 400 + code used 마킹 유지 (replay 차단)', async () => {
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: 'wrong-verifier', redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
            const after = await repo.findById(code);
            assert.strictEqual(after.used, true, 'replay 차단');
        });

        it('redirect_uri 불일치 → 400 + code used', async () => {
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: 'http://attacker.com/cb', clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
            const after = await repo.findById(code);
            assert.strictEqual(after.used, true);
        });

        it('client_id 불일치 → 400 + code used', async () => {
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: 'wrong-client', resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
            const after = await repo.findById(code);
            assert.strictEqual(after.used, true);
        });

        it('resource 불일치 → 400 + code used', async () => {
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: 'http://other.com/mcp' }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
            const after = await repo.findById(code);
            assert.strictEqual(after.used, true);
        });

        it('replay (성공 후 같은 code 재교환) → 400', async () => {
            await svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource });
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('code_verifier 누락 → 400', async () => {
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: '', redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('S256 가 아닌 challenge_method 면 PKCE 검증 실패 (plain 거부)', async () => {
            // codeChallengeMethod 강제 변경
            const data = repo.store.get(code);
            data.codeChallengeMethod = 'plain';
            await assert.rejects(
                () => svc.exchange({ code, codeVerifier: v, redirectUri: VALID.redirectUri, clientId: VALID.clientId, resource: VALID.resource }),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });
    });
});
