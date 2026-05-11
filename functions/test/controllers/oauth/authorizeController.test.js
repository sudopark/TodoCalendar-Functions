const assert = require('assert');
const AuthorizeController = require('../../../controllers/oauth/authorizeController');
const ConsentChallenge = require('../../../models/oauth/ConsentChallenge');

describe('controllers/oauth/AuthorizeController', () => {

    const CONSENT_URL = 'http://localhost:5173/oauth/consent';
    let svc, controller, res;

    const makeRes = () => ({
        _status: null, _location: null,
        redirect(status, url) {
            this._status = status;
            this._location = url;
        }
    });

    const makeReq = (query) => ({ query });

    beforeEach(() => {
        svc = {
            issueCalls: [],
            async issue(input) {
                this.issueCalls.push(input);
                return ConsentChallenge.fromData('ch-abc', {
                    clientId: input.clientId,
                    redirectUri: input.redirectUri,
                    codeChallenge: input.codeChallenge,
                    codeChallengeMethod: 'S256',
                    resource: input.resource,
                    scope: ['read:calendar'],
                    state: input.state,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 600 * 1000,
                    used: false
                });
            }
        };
        controller = new AuthorizeController(svc, CONSENT_URL);
        res = makeRes();
    });

    describe('constructor', () => {

        it('svc 누락 → throw', () => {
            assert.throws(() => new AuthorizeController(null, CONSENT_URL));
        });

        it('consentBaseUrl 누락 → throw', () => {
            assert.throws(() => new AuthorizeController(svc, ''));
        });
    });

    describe('authorize 정상', () => {

        it('302 + Location = CONSENT_URL?challenge=<id>', async () => {
            const req = makeReq({
                response_type: 'code',
                client_id: 'client-1',
                redirect_uri: 'http://127.0.0.1:54321/cb',
                state: 'state-xyz',
                code_challenge: 'pkce-challenge',
                code_challenge_method: 'S256',
                resource: 'http://localhost:3000/mcp',
                scope: 'read:calendar'
            });
            await controller.authorize(req, res);
            assert.strictEqual(res._status, 302);
            assert.strictEqual(res._location, `${CONSENT_URL}?challenge=ch-abc`);
        });

        it('snake_case query → camelCase service input', async () => {
            const req = makeReq({
                response_type: 'code',
                client_id: 'c1',
                redirect_uri: 'http://127.0.0.1:1/cb',
                state: 's',
                code_challenge: 'cc',
                code_challenge_method: 'S256',
                resource: 'r',
                scope: 'read:calendar'
            });
            await controller.authorize(req, res);
            const call = svc.issueCalls[0];
            assert.strictEqual(call.responseType, 'code');
            assert.strictEqual(call.clientId, 'c1');
            assert.strictEqual(call.redirectUri, 'http://127.0.0.1:1/cb');
            assert.strictEqual(call.codeChallenge, 'cc');
            assert.strictEqual(call.codeChallengeMethod, 'S256');
        });

        it('consentBaseUrl 이 이미 query 포함 시 & 로 append', async () => {
            const controller2 = new AuthorizeController(svc, 'http://web/oauth/consent?env=dev');
            await controller2.authorize(makeReq({
                response_type: 'code', client_id: 'c1', redirect_uri: 'http://127.0.0.1:1/cb',
                code_challenge: 'cc', code_challenge_method: 'S256',
                resource: 'r', scope: 'read:calendar'
            }), res);
            assert.strictEqual(res._location, 'http://web/oauth/consent?env=dev&challenge=ch-abc');
        });

        it('challenge id 가 URL-encode 됨', async () => {
            svc.issue = async () => ConsentChallenge.fromData('a/b c', {
                clientId: 'c1', redirectUri: 'r', codeChallenge: 'cc', codeChallengeMethod: 'S256',
                resource: 'r', scope: ['read:calendar'], state: null,
                createdAt: 0, expiresAt: Date.now() + 1000
            });
            await controller.authorize(makeReq({
                response_type: 'code', client_id: 'c1', redirect_uri: 'http://127.0.0.1:1/cb',
                code_challenge: 'cc', code_challenge_method: 'S256',
                resource: 'r', scope: 'read:calendar'
            }), res);
            assert.ok(res._location.endsWith('?challenge=a%2Fb%20c'));
        });
    });

    describe('authorize 실패 전파', () => {

        it('service 400 → Errors.Application wrap 후 status 유지', async () => {
            svc.issue = async () => {
                const e = new Error('bad');
                e.status = 400;
                e.code = 'InvalidClient';
                throw e;
            };
            await assert.rejects(
                () => controller.authorize(makeReq({}), res),
                e => e.status === 400 && e.code === 'InvalidClient'
            );
        });

        it('status 없는 throw → 500', async () => {
            svc.issue = async () => { throw new Error('boom'); };
            await assert.rejects(
                () => controller.authorize(makeReq({}), res),
                e => e.status === 500
            );
        });
    });
});
