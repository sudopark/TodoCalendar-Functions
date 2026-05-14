const assert = require('assert');
const TokenController = require('../../../controllers/oauth/tokenController');

describe('controllers/oauth/TokenController', () => {

    let codeService, signer, controller, res;

    const makeRes = () => ({
        _status: null, _body: null,
        status(s) { this._status = s; return this; },
        json(b) { this._body = b; return this; }
    });

    beforeEach(() => {
        codeService = {
            exchangeCalls: [],
            async exchange(input) {
                this.exchangeCalls.push(input);
                return {
                    userId: 'user-1',
                    clientId: 'client-1',
                    resource: 'http://localhost:3000/mcp',
                    scope: ['read:calendar', 'write:calendar']
                };
            }
        };
        signer = {
            signCalls: [],
            async signAccessToken(p) { this.signCalls.push(p); return `fake.jwt.${p.sub}`; }
        };
        controller = new TokenController(codeService, signer);
        res = makeRes();
    });

    describe('constructor', () => {

        it('codeService 누락 → throw', () => {
            assert.throws(() => new TokenController(null, signer));
        });

        it('tokenSigningService 누락 → throw', () => {
            assert.throws(() => new TokenController(codeService, null));
        });
    });

    describe('exchange — 정상', () => {

        it('200 + RFC 6749 token response (access_token / token_type / expires_in / scope)', async () => {
            await controller.exchange({
                body: {
                    grant_type: 'authorization_code',
                    code: 'code-xyz',
                    code_verifier: 'verifier',
                    redirect_uri: 'http://127.0.0.1:1/cb',
                    client_id: 'client-1',
                    resource: 'http://localhost:3000/mcp'
                }
            }, res);
            assert.strictEqual(res._status, 200);
            assert.strictEqual(res._body.access_token, 'fake.jwt.user-1');
            assert.strictEqual(res._body.token_type, 'Bearer');
            assert.strictEqual(res._body.expires_in, 7200);
            assert.strictEqual(res._body.scope, 'read:calendar write:calendar');
        });

        it('snake_case body → camelCase service input', async () => {
            await controller.exchange({
                body: {
                    grant_type: 'authorization_code',
                    code: 'c', code_verifier: 'v',
                    redirect_uri: 'http://127.0.0.1:1/cb',
                    client_id: 'cli',
                    resource: 'r'
                }
            }, res);
            const call = codeService.exchangeCalls[0];
            assert.strictEqual(call.code, 'c');
            assert.strictEqual(call.codeVerifier, 'v');
            assert.strictEqual(call.redirectUri, 'http://127.0.0.1:1/cb');
            assert.strictEqual(call.clientId, 'cli');
            assert.strictEqual(call.resource, 'r');
        });

        it('signAccessToken 인자 (sub, aud, scope, clientId, ttlSeconds=7200)', async () => {
            await controller.exchange({
                body: {
                    grant_type: 'authorization_code',
                    code: 'c', code_verifier: 'v',
                    redirect_uri: 'http://127.0.0.1:1/cb',
                    client_id: 'cli', resource: 'res'
                }
            }, res);
            const call = signer.signCalls[0];
            assert.strictEqual(call.sub, 'user-1');
            assert.strictEqual(call.aud, 'http://localhost:3000/mcp');
            assert.deepStrictEqual(call.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(call.clientId, 'client-1');
            assert.strictEqual(call.ttlSeconds, 7200);
        });
    });

    describe('exchange — 실패', () => {

        it('grant_type=password → 400 UnsupportedGrantType', async () => {
            await assert.rejects(
                () => controller.exchange({ body: { grant_type: 'password' } }, res),
                e => e.status === 400 && e.code === 'UnsupportedGrantType'
            );
        });

        it('grant_type 누락 → 400 UnsupportedGrantType', async () => {
            await assert.rejects(
                () => controller.exchange({ body: {} }, res),
                e => e.status === 400 && e.code === 'UnsupportedGrantType'
            );
        });

        it('code service 400 → status 유지 (Application wrap)', async () => {
            codeService.exchange = async () => {
                const e = new Error('bad');
                e.status = 400;
                e.code = 'InvalidGrant';
                throw e;
            };
            await assert.rejects(
                () => controller.exchange({
                    body: {
                        grant_type: 'authorization_code',
                        code: 'c', code_verifier: 'v',
                        redirect_uri: 'r', client_id: 'cli', resource: 'res'
                    }
                }, res),
                e => e.status === 400 && e.code === 'InvalidGrant'
            );
        });

        it('signer throw → 500', async () => {
            signer.signAccessToken = async () => { throw new Error('sign failed'); };
            await assert.rejects(
                () => controller.exchange({
                    body: {
                        grant_type: 'authorization_code',
                        code: 'c', code_verifier: 'v',
                        redirect_uri: 'r', client_id: 'cli', resource: 'res'
                    }
                }, res),
                e => e.status === 500
            );
        });
    });
});
