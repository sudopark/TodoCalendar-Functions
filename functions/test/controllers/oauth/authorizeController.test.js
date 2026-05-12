const assert = require('assert');
const AuthorizeController = require('../../../controllers/oauth/authorizeController');
const ConsentChallenge = require('../../../models/oauth/ConsentChallenge');
const OAuthClient = require('../../../models/oauth/OAuthClient');
const AuthorizationCode = require('../../../models/oauth/AuthorizationCode');

describe('controllers/oauth/AuthorizeController', () => {

    const CONSENT_URL = 'http://localhost:5173/oauth/consent';

    let svc, codeService, idTokenVerifier, controller, res;

    const makeRes = () => ({
        _status: null, _body: null, _location: null,
        status(s) { this._status = s; return this; },
        json(b) { this._body = b; return this; },
        redirect(status, url) { this._status = status; this._location = url; }
    });

    const makeReq = (overrides = {}) => ({
        query: overrides.query ?? {},
        params: overrides.params ?? {},
        body: overrides.body ?? {}
    });

    const SAMPLE_CHALLENGE = ConsentChallenge.fromData('ch-abc', {
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:54321/cb',
        codeChallenge: 'pkce-cc',
        codeChallengeMethod: 'S256',
        resource: 'http://localhost:3000/mcp',
        scope: ['read:calendar'],
        state: 'state-xyz',
        createdAt: Date.now(),
        expiresAt: Date.now() + 600 * 1000,
        used: false
    });

    const SAMPLE_CLIENT = OAuthClient.fromData('client-1', {
        clientName: 'Claude Desktop',
        redirectUris: ['http://127.0.0.1:54321/cb'],
        scope: ['read:calendar'],
        tokenEndpointAuthMethod: 'none',
        grantTypes: ['authorization_code'],
        responseTypes: ['code'],
        createdAt: 1000,
        lastUsedAt: null,
        dedupHash: 'h1'
    });

    beforeEach(() => {
        svc = {
            issueCalls: [],
            markUsedCalls: [],
            async issue(input) { this.issueCalls.push(input); return SAMPLE_CHALLENGE; },
            async getValid() { return SAMPLE_CHALLENGE; },
            async getConsentInfo() { return { challenge: SAMPLE_CHALLENGE, client: SAMPLE_CLIENT }; },
            async markUsed(id) { this.markUsedCalls.push(id); }
        };
        codeService = {
            issueCalls: [],
            async issue(input) {
                this.issueCalls.push(input);
                return AuthorizationCode.fromData('code-xyz', {
                    ...input,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 300 * 1000,
                    used: false
                });
            }
        };
        idTokenVerifier = async () => ({ uid: 'user-1' });
        controller = new AuthorizeController(svc, codeService, CONSENT_URL, idTokenVerifier);
        res = makeRes();
    });

    describe('constructor', () => {

        it('svc 누락 → throw', () => {
            assert.throws(() => new AuthorizeController(null, codeService, CONSENT_URL, idTokenVerifier));
        });

        it('codeService 누락 → throw', () => {
            assert.throws(() => new AuthorizeController(svc, null, CONSENT_URL, idTokenVerifier));
        });

        it('consentBaseUrl 누락 → throw', () => {
            assert.throws(() => new AuthorizeController(svc, codeService, '', idTokenVerifier));
        });

        it('idTokenVerifier 함수 아님 → throw', () => {
            assert.throws(() => new AuthorizeController(svc, codeService, CONSENT_URL, null));
            assert.throws(() => new AuthorizeController(svc, codeService, CONSENT_URL, 'not-a-fn'));
        });
    });

    describe('authorize', () => {

        it('302 + CONSENT_URL?challenge=<id>', async () => {
            await controller.authorize(makeReq({ query: { response_type: 'code', client_id: 'c1' } }), res);
            assert.strictEqual(res._status, 302);
            assert.strictEqual(res._location, `${CONSENT_URL}?challenge=ch-abc`);
        });

        it('client/redirect 검증 실패 (redirectableTo 없음) → status 유지 throw', async () => {
            svc.issue = async () => { const e = new Error('bad'); e.status = 400; e.code = 'InvalidClient'; throw e; };
            await assert.rejects(
                () => controller.authorize(makeReq({}), res),
                e => e.status === 400 && e.code === 'InvalidClient'
            );
        });

        it('redirectableTo 첨부된 error → 302 Location = redirect_uri?error=<code>&state=<state>', async () => {
            svc.issue = async () => {
                const e = new Error('bad');
                e.status = 400;
                e.code = 'InvalidRequest';
                e.redirectableTo = 'http://127.0.0.1:54321/cb';
                e.state = 'state-xyz';
                e.oauthErrorCode = 'invalid_request';
                throw e;
            };
            await controller.authorize(makeReq({}), res);
            assert.strictEqual(res._status, 302);
            const loc = new URL(res._location);
            assert.strictEqual(loc.searchParams.get('error'), 'invalid_request');
            assert.strictEqual(loc.searchParams.get('state'), 'state-xyz');
        });

        it('redirectableTo + state 없는 error → state 없이 redirect', async () => {
            svc.issue = async () => {
                const e = new Error('bad');
                e.status = 400;
                e.code = 'InvalidRequest';
                e.redirectableTo = 'http://127.0.0.1:54321/cb';
                e.oauthErrorCode = 'invalid_request';
                throw e;
            };
            await controller.authorize(makeReq({}), res);
            assert.strictEqual(res._status, 302);
            const loc = new URL(res._location);
            assert.strictEqual(loc.searchParams.get('error'), 'invalid_request');
            assert.strictEqual(loc.searchParams.get('state'), null);
        });
    });

    describe('getConsentPayload', () => {

        it('정상 → 200 + 응답 필드 (client_name / redirect_uri_origin / scope / resource / expires_at)', async () => {
            await controller.getConsentPayload(makeReq({ params: { id: 'ch-abc' } }), res);
            assert.strictEqual(res._status, 200);
            assert.strictEqual(res._body.client_name, 'Claude Desktop');
            assert.strictEqual(res._body.redirect_uri_origin, 'http://127.0.0.1:54321');
            assert.deepStrictEqual(res._body.scope, ['read:calendar']);
            assert.strictEqual(res._body.resource, 'http://localhost:3000/mcp');
            assert.ok(typeof res._body.expires_at === 'number');
        });

        it('challenge invalid → 404 InvalidChallenge', async () => {
            svc.getConsentInfo = async () => { throw Object.assign(new Error('expired'), { status: 400, code: 'InvalidChallenge', message: 'expired' }); };
            await controller.getConsentPayload(makeReq({ params: { id: 'x' } }), res);
            assert.strictEqual(res._status, 404);
            assert.strictEqual(res._body.error, 'InvalidChallenge');
            assert.strictEqual(res._body.reason, 'expired');
        });

        it('InconsistentState (500) → throw (Application wrap)', async () => {
            svc.getConsentInfo = async () => { throw Object.assign(new Error('orphan'), { status: 500, code: 'InconsistentState' }); };
            await assert.rejects(
                () => controller.getConsentPayload(makeReq({ params: { id: 'x' } }), res),
                e => e.status === 500
            );
        });
    });

    describe('consentCallback — challenge invalid', () => {

        it('expired challenge → 302 Web error page', async () => {
            svc.getValid = async () => { throw Object.assign(new Error('expired'), { status: 400, code: 'InvalidChallenge', message: 'expired' }); };
            await controller.consentCallback(makeReq({ body: { challenge: 'x', allow: 'true', id_token: 't' } }), res);
            assert.strictEqual(res._status, 302);
            assert.strictEqual(res._location, `${CONSENT_URL}/error?reason=expired`);
        });

        it('used challenge → 302 Web error page', async () => {
            svc.getValid = async () => { throw Object.assign(new Error('used'), { status: 400, code: 'InvalidChallenge', message: 'used' }); };
            await controller.consentCallback(makeReq({ body: { challenge: 'x', allow: 'true', id_token: 't' } }), res);
            assert.strictEqual(res._status, 302);
            assert.strictEqual(res._location, `${CONSENT_URL}/error?reason=used`);
        });

        it('unknown challenge → 302 Web error page', async () => {
            svc.getValid = async () => { throw Object.assign(new Error('unknown'), { status: 400, code: 'InvalidChallenge', message: 'unknown' }); };
            await controller.consentCallback(makeReq({ body: { challenge: 'x', allow: 'false' } }), res);
            assert.strictEqual(res._status, 302);
            assert.ok(res._location.endsWith('?reason=unknown'));
        });
    });

    describe('consentCallback — allow=true', () => {

        it('id_token verify 후 code 발급 + 303 redirect with code & state', async () => {
            await controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'true', id_token: 'id-tok' } }), res);
            assert.strictEqual(res._status, 303);
            assert.ok(res._location.includes('code=code-xyz'));
            assert.ok(res._location.includes('state=state-xyz'));
            // codeService.issue 가 challenge 의 모든 필드 전달
            const call = codeService.issueCalls[0];
            assert.strictEqual(call.userId, 'user-1');
            assert.strictEqual(call.clientId, 'client-1');
            assert.strictEqual(call.codeChallenge, 'pkce-cc');
            assert.deepStrictEqual(call.scope, ['read:calendar']);
            // challenge.markUsed 호출
            assert.deepStrictEqual(svc.markUsedCalls, ['ch-abc']);
        });

        it('id_token 누락 → 401', async () => {
            await assert.rejects(
                () => controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'true' } }), res),
                e => e.status === 401 && e.code === 'InvalidCredentials'
            );
        });

        it('id_token verify 실패 → 401', async () => {
            idTokenVerifier = async () => { throw new Error('invalid token'); };
            controller = new AuthorizeController(svc, codeService, CONSENT_URL, idTokenVerifier);
            await assert.rejects(
                () => controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'true', id_token: 'bad' } }), res),
                e => e.status === 401
            );
        });

        it('verify 통과했는데 uid 없음 → 401', async () => {
            idTokenVerifier = async () => ({ uid: undefined, sub: undefined });
            controller = new AuthorizeController(svc, codeService, CONSENT_URL, idTokenVerifier);
            await assert.rejects(
                () => controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'true', id_token: 't' } }), res),
                e => e.status === 401
            );
        });

        it('challenge markUsed race (InvalidChallenge) → 302 Web error', async () => {
            svc.markUsed = async () => { throw Object.assign(new Error('used'), { status: 400, code: 'InvalidChallenge', message: 'used' }); };
            await controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'true', id_token: 't' } }), res);
            assert.strictEqual(res._status, 302);
            assert.ok(res._location.endsWith('?reason=used'));
        });
    });

    describe('consentCallback — allow=false', () => {

        it('303 redirect with error=access_denied + state', async () => {
            await controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'false' } }), res);
            assert.strictEqual(res._status, 303);
            assert.ok(res._location.includes('error=access_denied'));
            assert.ok(res._location.includes('state=state-xyz'));
            // code 발급 X
            assert.strictEqual(codeService.issueCalls.length, 0);
            // challenge used 마킹
            assert.deepStrictEqual(svc.markUsedCalls, ['ch-abc']);
        });

        it('id_token 검증 생략 (allow=false 면 id_token 없어도 통과)', async () => {
            await controller.consentCallback(makeReq({ body: { challenge: 'ch-abc', allow: 'false' } }), res);
            assert.strictEqual(res._status, 303);
        });
    });
});
