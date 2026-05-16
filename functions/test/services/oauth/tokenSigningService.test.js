const assert = require('assert');
const { generateKeyPairSync } = require('crypto');
const jose = require('jose');
const TokenSigningService = require('../../../services/oauth/tokenSigningService');

describe('services/oauth/TokenSigningService', () => {

    const ISSUER = 'https://test.example.com';
    let privPem, pubPem;
    let svc;

    before(() => {
        const kp = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        privPem = kp.privateKey;
        pubPem = kp.publicKey;
    });

    beforeEach(() => {
        svc = new TokenSigningService(privPem, pubPem, ISSUER);
    });

    describe('constructor', () => {

        it('private key 없으면 throw', () => {
            assert.throws(() => new TokenSigningService(null, pubPem, ISSUER), /PRIVATE_KEY missing/);
        });

        it('public key 없으면 throw', () => {
            assert.throws(() => new TokenSigningService(privPem, null, ISSUER), /PUBLIC_KEY missing/);
        });

        it('issuer 없으면 throw', () => {
            assert.throws(() => new TokenSigningService(privPem, pubPem, null), /ISSUER missing/);
        });

        it('issuer trailing slash 제거', () => {
            const s1 = new TokenSigningService(privPem, pubPem, 'https://x.example/');
            assert.strictEqual(s1.issuer, 'https://x.example');
            const s2 = new TokenSigningService(privPem, pubPem, 'https://x.example///');
            assert.strictEqual(s2.issuer, 'https://x.example');
            const s3 = new TokenSigningService(privPem, pubPem, 'https://x.example');
            assert.strictEqual(s3.issuer, 'https://x.example');
        });
    });

    describe('getMetadata', () => {

        it('RFC 8414 필수 필드 모두 포함', () => {
            const meta = svc.getMetadata();
            assert.strictEqual(meta.issuer, ISSUER);
            assert.strictEqual(meta.authorization_endpoint, `${ISSUER}/v1/oauth/authorize`);
            assert.strictEqual(meta.token_endpoint, `${ISSUER}/v1/oauth/token`);
            assert.strictEqual(meta.registration_endpoint, `${ISSUER}/v1/oauth/register`);
            assert.strictEqual(meta.revocation_endpoint, `${ISSUER}/v1/oauth/revoke`);
            assert.strictEqual(meta.jwks_uri, `${ISSUER}/.well-known/jwks.json`);
            assert.deepStrictEqual(meta.response_types_supported, ['code']);
            assert.deepStrictEqual(meta.grant_types_supported, ['authorization_code', 'refresh_token']);
            assert.deepStrictEqual(meta.code_challenge_methods_supported, ['S256']);
            assert.deepStrictEqual(meta.token_endpoint_auth_methods_supported, ['none']);
            assert.deepStrictEqual(meta.revocation_endpoint_auth_methods_supported, ['none']);
        });

        it('scopes_supported 가 KNOWN_SCOPES 와 일치', () => {
            const meta = svc.getMetadata();
            assert.deepStrictEqual(meta.scopes_supported.sort(), ['read:calendar', 'write:calendar']);
        });

        it('issuer trailing slash 박혀도 metadata URL double slash 없음', () => {
            const slashSvc = new TokenSigningService(privPem, pubPem, 'https://x.example/');
            const meta = slashSvc.getMetadata();
            assert.strictEqual(meta.issuer, 'https://x.example');
            assert.strictEqual(meta.authorization_endpoint, 'https://x.example/v1/oauth/authorize');
            assert.strictEqual(meta.token_endpoint, 'https://x.example/v1/oauth/token');
            assert.strictEqual(meta.registration_endpoint, 'https://x.example/v1/oauth/register');
            assert.strictEqual(meta.revocation_endpoint, 'https://x.example/v1/oauth/revoke');
            assert.strictEqual(meta.jwks_uri, 'https://x.example/.well-known/jwks.json');
        });
    });

    describe('getJwks', () => {

        it('keys 배열에 RSA public key 노출', async () => {
            const jwks = await svc.getJwks();
            assert.strictEqual(jwks.keys.length, 1);
            const k = jwks.keys[0];
            assert.strictEqual(k.kty, 'RSA');
            assert.strictEqual(k.alg, 'RS256');
            assert.strictEqual(k.use, 'sig');
            assert.ok(k.kid && k.kid.length > 0, 'kid 부착');
            assert.ok(k.n && k.e, 'n/e 필드');
        });

        it('kid 가 deterministic (같은 key → 같은 kid)', async () => {
            const jwks1 = await svc.getJwks();
            const svc2 = new TokenSigningService(privPem, pubPem, ISSUER);
            const jwks2 = await svc2.getJwks();
            assert.strictEqual(jwks1.keys[0].kid, jwks2.keys[0].kid);
        });
    });

    describe('signAccessToken', () => {

        it('서명한 JWT 를 같은 public key 로 verify', async () => {
            const token = await svc.signAccessToken({
                sub: 'user-1',
                aud: 'http://mcp',
                scope: ['read:calendar'],
                clientId: 'client-1'
            });
            const pubKey = await jose.importSPKI(pubPem, 'RS256');
            const { payload, protectedHeader } = await jose.jwtVerify(token, pubKey, {
                issuer: ISSUER,
                audience: 'http://mcp'
            });
            assert.strictEqual(protectedHeader.alg, 'RS256');
            assert.strictEqual(payload.sub, 'user-1');
            assert.strictEqual(payload.aud, 'http://mcp');
            assert.strictEqual(payload.scope, 'read:calendar');
            assert.strictEqual(payload.client_id, 'client-1');
            assert.ok(payload.exp > payload.iat);
        });

        it('header.kid 가 JWKS 의 kid 와 일치', async () => {
            const token = await svc.signAccessToken({
                sub: 'user-1', aud: 'http://mcp', scope: ['read:calendar'], clientId: 'c1'
            });
            const jwks = await svc.getJwks();
            const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
            assert.strictEqual(decodedHeader.kid, jwks.keys[0].kid);
        });

        it('scope 가 배열일 때 공백 구분 string 으로 직렬화', async () => {
            const token = await svc.signAccessToken({
                sub: 'user-1', aud: 'http://mcp',
                scope: ['read:calendar', 'write:calendar'], clientId: 'c1'
            });
            const pubKey = await jose.importSPKI(pubPem, 'RS256');
            const { payload } = await jose.jwtVerify(token, pubKey, { issuer: ISSUER, audience: 'http://mcp' });
            assert.strictEqual(payload.scope, 'read:calendar write:calendar');
        });

        it('issuer trailing slash 박혀도 JWT iss 클레임 정규화', async () => {
            const slashSvc = new TokenSigningService(privPem, pubPem, 'https://x.example/');
            const token = await slashSvc.signAccessToken({
                sub: 'u', aud: 'a', scope: ['read:calendar'], clientId: 'c'
            });
            const pubKey = await jose.importSPKI(pubPem, 'RS256');
            const { payload } = await jose.jwtVerify(token, pubKey, { issuer: 'https://x.example', audience: 'a' });
            assert.strictEqual(payload.iss, 'https://x.example');
        });

        it('ttlSeconds 기본값 2시간 (7200s)', async () => {
            const before = Math.floor(Date.now() / 1000);
            const token = await svc.signAccessToken({
                sub: 'u', aud: 'a', scope: ['read:calendar'], clientId: 'c'
            });
            const pubKey = await jose.importSPKI(pubPem, 'RS256');
            const { payload } = await jose.jwtVerify(token, pubKey, { issuer: ISSUER, audience: 'a' });
            assert.ok(payload.exp - payload.iat === 7200, `exp - iat == 7200 (got ${payload.exp - payload.iat})`);
            assert.ok(payload.iat >= before);
        });
    });
});
