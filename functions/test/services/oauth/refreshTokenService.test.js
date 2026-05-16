const assert = require('assert');
const RefreshTokenService = require('../../../services/oauth/refreshTokenService');
const { StubRefreshTokenRepository } = require('../../doubles/stubOAuthRepositories');

describe('services/oauth/RefreshTokenService', () => {

    const baseIssue = {
        userId: 'user-1',
        clientId: 'client-1',
        scope: ['read:calendar', 'write:calendar'],
        resource: 'http://localhost:3000/mcp',
        redirectUri: 'http://127.0.0.1:54321/cb'
    };

    let repo;
    let svc;

    beforeEach(() => {
        repo = new StubRefreshTokenRepository();
        svc = new RefreshTokenService(repo, 3600);  // 1시간 TTL (테스트용)
    });

    describe('constructor', () => {

        it('repository 없으면 throw', () => {
            assert.throws(() => new RefreshTokenService(null), /repository required/);
        });
    });

    describe('issueForUser', () => {

        it('정상 발급 — opaque id + 새 family + parentId null', async () => {
            const tok = await svc.issueForUser(baseIssue);
            assert.ok(tok.id);
            assert.ok(tok.family);
            assert.strictEqual(tok.parentId, null);
            assert.strictEqual(tok.userId, 'user-1');
            assert.strictEqual(tok.clientId, 'client-1');
            assert.deepStrictEqual(tok.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(tok.resource, 'http://localhost:3000/mcp');
            assert.strictEqual(tok.redirectUri, 'http://127.0.0.1:54321/cb');
            assert.strictEqual(tok.revokedAt, null);
        });

        it('두 번 발급 시 family 가 다름 (각 호출 = 새 chain)', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            const t2 = await svc.issueForUser(baseIssue);
            assert.notStrictEqual(t1.family, t2.family);
        });

        it('expiresAt = now + ttlSeconds * 1000', async () => {
            const before = Date.now();
            const tok = await svc.issueForUser(baseIssue);
            const after = Date.now();
            assert.ok(tok.expiresAt >= before + 3600 * 1000);
            assert.ok(tok.expiresAt <= after + 3600 * 1000);
        });

        it('userId 없으면 400 InvalidRequest', async () => {
            await assert.rejects(
                svc.issueForUser({ ...baseIssue, userId: '' }),
                err => err.status === 400 && err.code === 'InvalidRequest'
            );
        });

        it('scope 비배열이면 400 InvalidRequest', async () => {
            await assert.rejects(
                svc.issueForUser({ ...baseIssue, scope: 'read:calendar' }),
                err => err.status === 400 && err.code === 'InvalidRequest'
            );
        });

        it('scope 빈 배열이면 400 InvalidRequest', async () => {
            await assert.rejects(
                svc.issueForUser({ ...baseIssue, scope: [] }),
                err => err.status === 400 && err.code === 'InvalidRequest'
            );
        });
    });

    describe('rotate — 정상', () => {

        it('valid token rotation → 새 token 발급 + 같은 family + parentId 체인 + 옛 token revoked', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            const t2 = await svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1' });
            assert.notStrictEqual(t2.id, t1.id);
            assert.strictEqual(t2.family, t1.family);
            assert.strictEqual(t2.parentId, t1.id);
            assert.strictEqual(t2.userId, t1.userId);
            assert.deepStrictEqual(t2.scope, t1.scope);
            // 옛 token 은 revoked
            const oldStored = await repo.findById(t1.id);
            assert.ok(oldStored.isRevoked(), 'old token must be revoked');
        });

        it('resource 인자 미지정 시 검증 skip → rotation 성공', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            const t2 = await svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1' });
            assert.ok(t2.id);
        });
    });

    describe('rotate — 실패', () => {

        it('refreshTokenId 없음 → 400 InvalidGrant', async () => {
            await assert.rejects(
                svc.rotate({ refreshTokenId: '', clientId: 'c' }),
                err => err.status === 400 && err.code === 'InvalidGrant'
            );
        });

        it('not-found → 400 InvalidGrant', async () => {
            await assert.rejects(
                svc.rotate({ refreshTokenId: 'nope', clientId: 'c' }),
                err => err.status === 400 && err.code === 'InvalidGrant'
            );
        });

        it('expired → 400 InvalidGrant', async () => {
            // svc TTL 1시간이지만 stub 이 직접 seed 한 expired token 으로 검증
            repo.seed('expired-1', {
                userId: 'u', clientId: 'client-1', scope: ['read:calendar'],
                resource: 'r', redirectUri: 'http://127.0.0.1:1/cb',
                family: 'fam-x', parentId: null,
                createdAt: Date.now() - 10000,
                expiresAt: Date.now() - 1000,   // 이미 만료
                revokedAt: null
            });
            await assert.rejects(
                svc.rotate({ refreshTokenId: 'expired-1', clientId: 'client-1' }),
                err => err.status === 400 && err.code === 'InvalidGrant' && /expired/.test(err.message)
            );
        });

        it('client_id mismatch → 400 InvalidGrant', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            await assert.rejects(
                svc.rotate({ refreshTokenId: t1.id, clientId: 'wrong-client' }),
                err => err.status === 400 && err.code === 'InvalidGrant' && /client_id/.test(err.message)
            );
        });

        it('resource mismatch → 400 InvalidGrant', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            await assert.rejects(
                svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1', resource: 'http://wrong/mcp' }),
                err => err.status === 400 && err.code === 'InvalidGrant' && /resource/.test(err.message)
            );
        });
    });

    describe('rotate — reuse detect (탈취 차단)', () => {

        it('이미 revoked 된 token 으로 rotate → family 전체 revoke + reject', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            const t2 = await svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1' });
            // 이 시점: t1 revoked, t2 valid
            assert.strictEqual(t2.isRevoked(), false);

            // 탈취 시나리오 — 공격자가 가로챈 t1 으로 다시 rotate 시도
            await assert.rejects(
                svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1' }),
                err => err.status === 400 && err.code === 'InvalidGrant' && /reuse/.test(err.message)
            );

            // 같은 family 의 t2 도 함께 revoke 되어 더 이상 못 씀
            const t2After = await repo.findById(t2.id);
            assert.ok(t2After.isRevoked(), 't2 must be revoked by family revocation');

            // family revoke 가 호출됐는지 spy 확인
            assert.ok(repo.revokeFamilyCalls.length >= 1);
            assert.strictEqual(repo.revokeFamilyCalls[0].family, t1.family);
        });

        it('reuse detect 후 valid 였던 sibling 으로 rotate 시도 → reuse 로 detect + family 재revoke', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            await svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1' });   // t2 발급
            await assert.rejects(   // 공격자가 t1 으로 시도 → family revoke
                svc.rotate({ refreshTokenId: t1.id, clientId: 'client-1' }),
                err => /reuse/.test(err.message)
            );

            // 이제 정상 client 가 t2 로 rotate 시도해도 reject (t2 도 family revoke 로 invalidated)
            const t2 = Array.from(repo.store.values()).find(d => d.parentId === t1.id);
            const t2Id = Array.from(repo.store.entries()).find(([_, d]) => d.parentId === t1.id)[0];
            await assert.rejects(
                svc.rotate({ refreshTokenId: t2Id, clientId: 'client-1' }),
                err => err.status === 400 && err.code === 'InvalidGrant' && /reuse/.test(err.message)
            );
        });
    });

    describe('revoke (RFC 7009)', () => {

        it('valid token revoke → revokedAt 박힘', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            await svc.revoke({ refreshTokenId: t1.id });
            const after = await repo.findById(t1.id);
            assert.ok(after.isRevoked());
        });

        it('not-found 토큰 revoke → silent (throw 안 함)', async () => {
            await svc.revoke({ refreshTokenId: 'nope' });   // throw 없이 return
        });

        it('빈 문자열 → silent', async () => {
            await svc.revoke({ refreshTokenId: '' });
        });

        it('이미 revoked 토큰 → silent', async () => {
            const t1 = await svc.issueForUser(baseIssue);
            await svc.revoke({ refreshTokenId: t1.id });
            await svc.revoke({ refreshTokenId: t1.id });   // 두 번째 호출도 throw 안 함
        });
    });
});
