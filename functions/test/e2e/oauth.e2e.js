const assert = require('assert');
const crypto = require('crypto');
const axios = require('axios');
const admin = require('firebase-admin');
const jose = require('jose');
const { getAuthToken, BASE_URL } = require('./helpers/request');

const NO_REDIRECT = { validateStatus: () => true, maxRedirects: 0 };

function pkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

async function registerClient(name = 'E2E Test') {
    const redirectUri = `http://127.0.0.1:${10000 + Math.floor(Math.random() * 50000)}/cb`;
    const res = await axios.post(`${BASE_URL}/v1/oauth/register`, {
        client_name: name,
        redirect_uris: [redirectUri],
        scope: 'read:calendar write:calendar',
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
        response_types: ['code']
    }, NO_REDIRECT);
    return { res, redirectUri };
}

function challengeIdFromLocation(location) {
    const url = new URL(location);
    return url.searchParams.get('challenge');
}

function authorizeQuery({ clientId, redirectUri, codeChallenge, state = 'test-state', scope = 'read:calendar' }) {
    return new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        resource: process.env.OAUTH_CALENDAR_RESOURCE_URI,
        scope
    }).toString();
}

describe('OAuth AS — well-known', () => {

    it('GET /.well-known/oauth-authorization-server → RFC 8414 metadata', async () => {
        const res = await axios.get(`${BASE_URL}/.well-known/oauth-authorization-server`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers['cache-control'], 'public, max-age=600');
        assert.strictEqual(res.data.issuer, process.env.OAUTH_ISSUER);
        assert.ok(res.data.authorization_endpoint.endsWith('/v1/oauth/authorize'));
        assert.ok(res.data.token_endpoint.endsWith('/v1/oauth/token'));
        assert.ok(res.data.registration_endpoint.endsWith('/v1/oauth/register'));
        assert.ok(res.data.revocation_endpoint.endsWith('/v1/oauth/revoke'));
        assert.deepStrictEqual(res.data.response_types_supported, ['code']);
        assert.deepStrictEqual(res.data.grant_types_supported, ['authorization_code', 'refresh_token']);
        assert.deepStrictEqual(res.data.code_challenge_methods_supported, ['S256']);
        assert.deepStrictEqual(res.data.token_endpoint_auth_methods_supported, ['none']);
        assert.deepStrictEqual(res.data.scopes_supported.sort(), ['read:calendar', 'write:calendar']);
    });

    it('GET /.well-known/jwks.json → RFC 7517 JWKS', async () => {
        const res = await axios.get(`${BASE_URL}/.well-known/jwks.json`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers['cache-control'], 'public, max-age=600');
        assert.strictEqual(res.data.keys.length, 1);
        const k = res.data.keys[0];
        assert.strictEqual(k.kty, 'RSA');
        assert.strictEqual(k.alg, 'RS256');
        assert.strictEqual(k.use, 'sig');
        assert.ok(k.kid && k.kid.length > 0);
        assert.ok(k.n && k.e);
    });
});

describe('OAuth AS — register', () => {

    it('정상 등록 → 201 + RFC 7591 응답', async () => {
        const { res, redirectUri } = await registerClient('Happy Client');
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.client_id);
        assert.ok(res.data.client_id_issued_at > 0);
        assert.strictEqual(res.data.client_name, 'Happy Client');
        assert.deepStrictEqual(res.data.redirect_uris, [redirectUri]);
        assert.strictEqual(res.data.token_endpoint_auth_method, 'none');
        assert.strictEqual(res.data.scope, 'read:calendar write:calendar');
    });

    it('unknown scope → 400', async () => {
        const res = await axios.post(`${BASE_URL}/v1/oauth/register`, {
            client_name: 'X',
            redirect_uris: ['http://127.0.0.1:9999/cb'],
            scope: 'unknown:scope',
            token_endpoint_auth_method: 'none',
            grant_types: ['authorization_code'],
            response_types: ['code']
        }, NO_REDIRECT);
        assert.strictEqual(res.status, 400);
    });

    it('redirect_uri HTTPS 도 loopback 도 아님 → 400', async () => {
        const res = await axios.post(`${BASE_URL}/v1/oauth/register`, {
            client_name: 'X',
            redirect_uris: ['http://example.com/cb'],
            scope: 'read:calendar',
            token_endpoint_auth_method: 'none',
            grant_types: ['authorization_code'],
            response_types: ['code']
        }, NO_REDIRECT);
        assert.strictEqual(res.status, 400);
    });

    it('redirect_uri 에 userinfo 포함 (`https://victim@evil.com/cb`) → 400', async () => {
        const res = await axios.post(`${BASE_URL}/v1/oauth/register`, {
            client_name: 'X',
            redirect_uris: ['https://victim@evil.com/cb'],
            scope: 'read:calendar',
            token_endpoint_auth_method: 'none',
            grant_types: ['authorization_code'],
            response_types: ['code']
        }, NO_REDIRECT);
        assert.strictEqual(res.status, 400);
    });
});

describe('OAuth AS — happy path (한 바퀴)', () => {

    let clientId, redirectUri, verifier, challengeId, code, refreshToken;

    it('1. register → client_id 발급', async () => {
        const { res, redirectUri: r } = await registerClient('Flow Client');
        clientId = res.data.client_id;
        redirectUri = r;
        assert.ok(clientId);
    });

    it('2. authorize → 302 Location = OAUTH_CONSENT_URL?challenge=<id>', async () => {
        const { verifier: v, challenge } = pkce();
        verifier = v;
        const qs = authorizeQuery({ clientId, redirectUri, codeChallenge: challenge });
        const res = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        assert.strictEqual(res.status, 302);
        const loc = res.headers.location;
        assert.ok(loc.startsWith(process.env.OAUTH_CONSENT_URL), `Location: ${loc}`);
        challengeId = challengeIdFromLocation(loc);
        assert.ok(challengeId);
    });

    it('3. GET /consent/:id → 200 + payload', async () => {
        const res = await axios.get(`${BASE_URL}/v1/oauth/consent/${challengeId}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.client_name, 'Flow Client');
        assert.strictEqual(res.data.redirect_uri_origin, new URL(redirectUri).origin);
        assert.deepStrictEqual(res.data.scope, ['read:calendar']);
        assert.strictEqual(res.data.resource, process.env.OAUTH_CALENDAR_RESOURCE_URI);
        assert.ok(typeof res.data.expires_at === 'number');
    });

    it('4. POST /consent/callback (allow=true, id_token) → 303 Location = redirectUri?code=&state=', async () => {
        const idToken = getAuthToken();
        const body = new URLSearchParams({ challenge: challengeId, allow: 'true', id_token: idToken });
        const res = await axios.post(`${BASE_URL}/v1/oauth/consent/callback`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 303);
        const loc = new URL(res.headers.location);
        assert.strictEqual(`${loc.origin}${loc.pathname}`, redirectUri);
        code = loc.searchParams.get('code');
        assert.ok(code);
        assert.strictEqual(loc.searchParams.get('state'), 'test-state');
    });

    it('5. POST /token → 200 access_token + JWKS verify 성공', async () => {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            code_verifier: verifier,
            redirect_uri: redirectUri,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const res = await axios.post(`${BASE_URL}/v1/oauth/token`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 200);
        // RFC 6749 §5.1 — token 응답은 캐싱 차단
        assert.strictEqual(res.headers['cache-control'], 'no-store');
        assert.strictEqual(res.headers['pragma'], 'no-cache');
        assert.ok(res.data.access_token);
        assert.strictEqual(res.data.token_type, 'Bearer');
        assert.strictEqual(res.data.expires_in, 7200);
        assert.strictEqual(res.data.scope, 'read:calendar');
        assert.ok(res.data.refresh_token, 'refresh_token 동시 발급');
        refreshToken = res.data.refresh_token;

        // JWKS 로 verify
        const jwksRes = await axios.get(`${BASE_URL}/.well-known/jwks.json`);
        const jwk = jwksRes.data.keys[0];
        const publicKey = await jose.importJWK(jwk, 'RS256');
        const { payload, protectedHeader } = await jose.jwtVerify(
            res.data.access_token, publicKey,
            { issuer: process.env.OAUTH_ISSUER, audience: process.env.OAUTH_CALENDAR_RESOURCE_URI }
        );
        assert.strictEqual(protectedHeader.alg, 'RS256');
        assert.strictEqual(protectedHeader.kid, jwk.kid);
        assert.ok(payload.sub);
        assert.strictEqual(payload.scope, 'read:calendar');
        assert.strictEqual(payload.client_id, clientId);
    });

    it('6. POST /token (grant_type=refresh_token) → 200 + 새 access_token + 새 refresh_token (rotation)', async () => {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const res = await axios.post(`${BASE_URL}/v1/oauth/token`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.data.access_token);
        assert.strictEqual(res.data.token_type, 'Bearer');
        assert.strictEqual(res.data.expires_in, 7200);
        assert.strictEqual(res.data.scope, 'read:calendar');
        assert.ok(res.data.refresh_token, 'rotated refresh_token');
        assert.notStrictEqual(res.data.refresh_token, refreshToken, 'rotation 으로 새 refresh_token 발급');
        // 새 access_token 도 JWKS 로 verify
        const jwksRes = await axios.get(`${BASE_URL}/.well-known/jwks.json`);
        const jwk = jwksRes.data.keys[0];
        const publicKey = await jose.importJWK(jwk, 'RS256');
        const { payload } = await jose.jwtVerify(
            res.data.access_token, publicKey,
            { issuer: process.env.OAUTH_ISSUER, audience: process.env.OAUTH_CALENDAR_RESOURCE_URI }
        );
        assert.ok(payload.sub);
        assert.strictEqual(payload.client_id, clientId);
        // 다음 케이스가 쓰도록 새 refresh_token 으로 갱신
        refreshToken = res.data.refresh_token;
    });

    it('7. 옛 refresh_token 으로 재사용 시도 → 400 InvalidGrant (reuse detect)', async () => {
        // 단계 6 에서 rotation 후 옛 토큰은 revoked 상태. 공격자가 가로챈 옛 토큰으로 시도하는 시나리오.
        // 본 테스트는 단계 5 시점의 refreshToken (이미 단계 6 에서 revoked) 을 다시 박는 게 정확하지만,
        // 변수 갱신으로 단계 6 의 새 토큰을 한 번 더 rotate 해 직전 토큰을 revoke 후 옛 거 시도해도 같은 효과.
        // 여기선 단계 6 결과 (rotation 1회 이미 완료) 의 그 직전 (already revoked) 토큰 검증 흐름이 단순치 않아,
        // 새 시나리오로 1) rotate 한 번 → 2) 옛 거 재사용 흐름을 다시 박음.

        // 1) 현재 refreshToken (단계 6 결과) 로 rotate → 새 refresh_token2
        const body1 = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const res1 = await axios.post(`${BASE_URL}/v1/oauth/token`, body1.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res1.status, 200);
        const refreshToken2 = res1.data.refresh_token;
        assert.notStrictEqual(refreshToken2, refreshToken);

        // 2) 이제 옛 refreshToken (방금 rotate 로 revoked 됨) 으로 다시 시도 → 400 InvalidGrant
        const body2 = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const res2 = await axios.post(`${BASE_URL}/v1/oauth/token`, body2.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res2.status, 400);

        // 3) family 가 revoke 됐으므로 refreshToken2 도 무력화 → 정상 client 도 더 못 씀
        const body3 = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken2,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const res3 = await axios.post(`${BASE_URL}/v1/oauth/token`, body3.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res3.status, 400);
    });

    it('8. POST /revoke — refresh_token 회수 후 동일 token 으로 refresh 시도 → 400', async () => {
        // 단계 1~5 재실행해 새로운 valid refresh_token 확보 (직전 family 는 7단계에서 모두 revoked).
        const { res: rr } = await registerClient('Revoke Client');
        const newClientId = rr.data.client_id;
        const newRedirectUri = rr.data.redirect_uris[0];
        const { verifier: v, challenge: ch } = pkce();
        const qs = authorizeQuery({ clientId: newClientId, redirectUri: newRedirectUri, codeChallenge: ch });
        const authzRes = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        const newChallengeId = challengeIdFromLocation(authzRes.headers.location);
        const idToken = getAuthToken();
        const cbBody = new URLSearchParams({ challenge: newChallengeId, allow: 'true', id_token: idToken });
        const cbRes = await axios.post(`${BASE_URL}/v1/oauth/consent/callback`, cbBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const newCode = new URL(cbRes.headers.location).searchParams.get('code');
        const tokenBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: newCode, code_verifier: v,
            redirect_uri: newRedirectUri, client_id: newClientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const tokenRes = await axios.post(`${BASE_URL}/v1/oauth/token`, tokenBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const newRefreshToken = tokenRes.data.refresh_token;

        // POST /revoke → 200 (RFC 7009 §2.2)
        const revokeBody = new URLSearchParams({ token: newRefreshToken });
        const revokeRes = await axios.post(`${BASE_URL}/v1/oauth/revoke`, revokeBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(revokeRes.status, 200);

        // 회수된 token 으로 refresh 시도 → 400 InvalidGrant (reuse detect 분기)
        const useBody = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: newRefreshToken,
            client_id: newClientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const useRes = await axios.post(`${BASE_URL}/v1/oauth/token`, useBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(useRes.status, 400);

        // 9. 알 수 없는 token 으로 revoke → silent 200 (RFC 7009 §2.2)
        const unknownBody = new URLSearchParams({ token: 'totally-unknown-token-id' });
        const unknownRes = await axios.post(`${BASE_URL}/v1/oauth/revoke`, unknownBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(unknownRes.status, 200);

        // 10. token 누락 → 400 InvalidRequest
        const emptyBody = new URLSearchParams({});
        const emptyRes = await axios.post(`${BASE_URL}/v1/oauth/revoke`, emptyBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(emptyRes.status, 400);
    });
});

describe('OAuth AS — negative', () => {

    let clientId, redirectUri;

    before(async () => {
        const { res, redirectUri: r } = await registerClient('Negative Client');
        clientId = res.data.client_id;
        redirectUri = r;
    });

    it('authorize: 미등록 client → 400', async () => {
        const qs = authorizeQuery({
            clientId: 'unknown-client', redirectUri,
            codeChallenge: 'dummy'
        });
        const res = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        assert.strictEqual(res.status, 400);
    });

    it('authorize: redirect_uri 정확 일치 안 함 → 400', async () => {
        const qs = authorizeQuery({
            clientId, redirectUri: 'http://attacker.com/cb',
            codeChallenge: 'dummy'
        });
        const res = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        assert.strictEqual(res.status, 400);
    });

    it('authorize: code_challenge_method=plain → 302 redirect with error=invalid_request (RFC 6749 §4.1.2.1)', async () => {
        const qs = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            state: 's',
            code_challenge: 'dummy',
            code_challenge_method: 'plain',
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI,
            scope: 'read:calendar'
        }).toString();
        const res = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        assert.strictEqual(res.status, 302);
        const loc = new URL(res.headers.location);
        assert.strictEqual(`${loc.origin}${loc.pathname}`, redirectUri);
        assert.strictEqual(loc.searchParams.get('error'), 'invalid_request');
        assert.strictEqual(loc.searchParams.get('state'), 's');
    });

    it('authorize: resource 화이트리스트 외 → 302 redirect with error=invalid_request', async () => {
        const { challenge } = pkce();
        const qs = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            state: 's',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            resource: 'http://attacker.com/mcp',
            scope: 'read:calendar'
        }).toString();
        const res = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        assert.strictEqual(res.status, 302);
        const loc = new URL(res.headers.location);
        assert.strictEqual(loc.searchParams.get('error'), 'invalid_request');
    });

    it('consent/callback: invalid challenge → 302 Web error', async () => {
        const body = new URLSearchParams({
            challenge: 'does-not-exist',
            allow: 'true',
            id_token: getAuthToken()
        });
        const res = await axios.post(`${BASE_URL}/v1/oauth/consent/callback`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 302);
        assert.ok(res.headers.location.includes('/error?reason=unknown'));
    });

    it('consent/callback: allow=false → 303 redirectUri?error=access_denied', async () => {
        const { verifier, challenge } = pkce();
        const qs = authorizeQuery({ clientId, redirectUri, codeChallenge: challenge });
        const authRes = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        const challengeId = challengeIdFromLocation(authRes.headers.location);

        const body = new URLSearchParams({ challenge: challengeId, allow: 'false' });
        const res = await axios.post(`${BASE_URL}/v1/oauth/consent/callback`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 303);
        const loc = new URL(res.headers.location);
        assert.strictEqual(loc.searchParams.get('error'), 'access_denied');
    });

    it('token: code_verifier 불일치 → 400 + code used (replay 차단)', async () => {
        const { verifier, challenge } = pkce();
        const qs = authorizeQuery({ clientId, redirectUri, codeChallenge: challenge, state: 's' });
        const authRes = await axios.get(`${BASE_URL}/v1/oauth/authorize?${qs}`, NO_REDIRECT);
        const challengeId = challengeIdFromLocation(authRes.headers.location);
        const cbBody = new URLSearchParams({ challenge: challengeId, allow: 'true', id_token: getAuthToken() });
        const cbRes = await axios.post(`${BASE_URL}/v1/oauth/consent/callback`, cbBody.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const code = new URL(cbRes.headers.location).searchParams.get('code');

        // 잘못된 verifier
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            code_verifier: 'wrong-verifier',
            redirect_uri: redirectUri,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const res = await axios.post(`${BASE_URL}/v1/oauth/token`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 400);

        // 재시도 — 정확한 verifier 라도 이미 used 라 거부
        const retry = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            code_verifier: verifier,
            redirect_uri: redirectUri,
            client_id: clientId,
            resource: process.env.OAUTH_CALENDAR_RESOURCE_URI
        });
        const retryRes = await axios.post(`${BASE_URL}/v1/oauth/token`, retry.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(retryRes.status, 400);
    });

    it('token: grant_type=password → 400 UnsupportedGrantType', async () => {
        const body = new URLSearchParams({
            grant_type: 'password',
            code: 'x', code_verifier: 'x', redirect_uri: 'x', client_id: 'x', resource: 'x'
        });
        const res = await axios.post(`${BASE_URL}/v1/oauth/token`, body.toString(), {
            ...NO_REDIRECT,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.data.code, 'UnsupportedGrantType');
    });
});
