const assert = require('assert');
const OAuthClientService = require('../../../services/oauth/oauthClientService');
const { StubOAuthClientRepository } = require('../../doubles/stubOAuthRepositories');

describe('services/oauth/OAuthClientService', () => {

    let repo;
    let svc;

    const VALID = {
        clientName: 'Claude Desktop',
        redirectUris: ['http://127.0.0.1:54321/callback'],
        scope: 'read:calendar write:calendar',
        tokenEndpointAuthMethod: 'none',
        grantTypes: ['authorization_code'],
        responseTypes: ['code']
    };

    beforeEach(() => {
        repo = new StubOAuthClientRepository();
        svc = new OAuthClientService(repo);
    });

    describe('register — 정상', () => {

        it('OAuthClient 반환 + scope 배열로 변환', async () => {
            const c = await svc.register(VALID, { ip: '1.1.1.1' });
            assert.ok(c.id);
            assert.strictEqual(c.clientName, 'Claude Desktop');
            assert.deepStrictEqual(c.scope, ['read:calendar', 'write:calendar']);
            assert.deepStrictEqual(c.redirectUris, ['http://127.0.0.1:54321/callback']);
            assert.strictEqual(c.tokenEndpointAuthMethod, 'none');
        });

        it('repository.create payload 에 createdAt + lastUsedAt:null + dedupHash 포함', async () => {
            await svc.register(VALID, { ip: '1.1.1.1' });
            const p = repo.lastCreatedPayload;
            assert.ok(typeof p.createdAt === 'number');
            assert.strictEqual(p.lastUsedAt, null);
            assert.ok(p.dedupHash && p.dedupHash.length === 64);  // sha256 hex
        });

        it('localhost loopback redirect_uri 허용', async () => {
            const c = await svc.register({
                ...VALID,
                redirectUris: ['http://localhost:3000/cb']
            }, { ip: '1.1.1.1' });
            assert.deepStrictEqual(c.redirectUris, ['http://localhost:3000/cb']);
        });

        it('HTTPS redirect_uri 허용', async () => {
            const c = await svc.register({
                ...VALID,
                redirectUris: ['https://example.com/cb']
            }, { ip: '1.1.1.1' });
            assert.deepStrictEqual(c.redirectUris, ['https://example.com/cb']);
        });
    });

    describe('register — clientName sanitize', () => {

        it('empty → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, clientName: '' }, { ip: '1.1.1.1' }),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });

        it('65자 (max 초과) → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, clientName: 'a'.repeat(65) }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('control char (\\x01) → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, clientName: 'bad\x01name' }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('non-string → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, clientName: null }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });
    });

    describe('register — redirect_uri sanitize', () => {

        it('empty array → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: [] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('null → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: null }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('HTTP non-loopback (http://example.com) → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: ['http://example.com/cb'] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('fragment 포함 → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: ['https://example.com/cb#frag'] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('형식 깨진 URL → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: ['not-a-url'] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('userinfo (`https://victim@evil.com/cb`) → 400 (social-engineering 차단)', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: ['https://victim@evil.com/cb'] }, { ip: '1.1.1.1' }),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });

        it('userinfo + 패스워드 (`https://user:pass@example.com/cb`) → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: ['https://user:pass@example.com/cb'] }, { ip: '1.1.1.1' }),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });

        it('loopback userinfo (`http://127.0.0.1@evil.com/cb`) → 400 (loopback 외양 우회 차단)', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, redirectUris: ['http://127.0.0.1@evil.com/cb'] }, { ip: '1.1.1.1' }),
                e => e.status === 400 && e.code === 'InvalidRequest'
            );
        });
    });

    describe('register — scope sanitize', () => {

        it('unknown scope → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, scope: 'unknown:scope' }, { ip: '1.1.1.1' }),
                e => e.status === 400 && e.code === 'InvalidScope'
            );
        });

        it('빈 scope → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, scope: '' }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });
    });

    describe('register — auth_method / grant_types / response_types', () => {

        it('token_endpoint_auth_method=client_secret_basic → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, tokenEndpointAuthMethod: 'client_secret_basic' }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('grant_types=password → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, grantTypes: ['password'] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('grant_types 빈 배열 → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, grantTypes: [] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });

        it('grant_types=[authorization_code, refresh_token] → 정상 (metadata grant_types_supported 와 align)', async () => {
            const c = await svc.register(
                { ...VALID, grantTypes: ['authorization_code', 'refresh_token'] },
                { ip: '1.1.1.1' }
            );
            assert.ok(c.id);
        });

        it('grant_types=[refresh_token] (authorization_code 누락) → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, grantTypes: ['refresh_token'] }, { ip: '1.1.1.1' }),
                e => e.status === 400 && /authorization_code/.test(e.message)
            );
        });

        it('grant_types=[authorization_code, password] → 400 (unsupported 거부 유지)', async () => {
            await assert.rejects(
                () => svc.register(
                    { ...VALID, grantTypes: ['authorization_code', 'password'] },
                    { ip: '1.1.1.1' }
                ),
                e => e.status === 400 && /password/.test(e.message)
            );
        });

        it('response_types=token → 400', async () => {
            await assert.rejects(
                () => svc.register({ ...VALID, responseTypes: ['token'] }, { ip: '1.1.1.1' }),
                e => e.status === 400
            );
        });
    });

    describe('register — L3 dedup', () => {

        it('동일 (ip, clientName, redirect_uris) 재요청 → 기존 client_id 반환', async () => {
            const c1 = await svc.register(VALID, { ip: '1.1.1.1' });
            const c2 = await svc.register(VALID, { ip: '1.1.1.1' });
            assert.strictEqual(c1.id, c2.id);
            assert.strictEqual(repo.store.size, 1);
        });

        it('다른 IP → 새 client_id 발급', async () => {
            const c1 = await svc.register(VALID, { ip: '1.1.1.1' });
            const c2 = await svc.register(VALID, { ip: '2.2.2.2' });
            assert.notStrictEqual(c1.id, c2.id);
            assert.strictEqual(repo.store.size, 2);
        });

        it('다른 clientName → 새 client_id 발급', async () => {
            const c1 = await svc.register(VALID, { ip: '1.1.1.1' });
            const c2 = await svc.register({ ...VALID, clientName: 'Other Host' }, { ip: '1.1.1.1' });
            assert.notStrictEqual(c1.id, c2.id);
        });

        it('redirect_uris 순서 무관 (정렬 후 dedup hash)', async () => {
            const c1 = await svc.register({
                ...VALID,
                redirectUris: ['http://127.0.0.1:1/a', 'http://127.0.0.1:2/b']
            }, { ip: '1.1.1.1' });
            const c2 = await svc.register({
                ...VALID,
                redirectUris: ['http://127.0.0.1:2/b', 'http://127.0.0.1:1/a']
            }, { ip: '1.1.1.1' });
            assert.strictEqual(c1.id, c2.id);
        });

        it('1시간 초과 → 새 발급', async () => {
            const c1 = await svc.register(VALID, { ip: '1.1.1.1' });
            // 기존 record 의 createdAt 을 2시간 전으로 강제
            const existingData = repo.store.get(c1.id);
            existingData.createdAt = Date.now() - 2 * 60 * 60 * 1000;
            const c2 = await svc.register(VALID, { ip: '1.1.1.1' });
            assert.notStrictEqual(c1.id, c2.id);
        });
    });
});
