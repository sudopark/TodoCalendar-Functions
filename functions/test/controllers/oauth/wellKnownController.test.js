const assert = require('assert');
const WellKnownController = require('../../../controllers/oauth/wellKnownController');

describe('controllers/oauth/WellKnownController', () => {

    let stubSvc;
    let controller;
    let res;

    beforeEach(() => {
        stubSvc = {
            getMetadata: () => ({ issuer: 'https://test', authorization_endpoint: 'https://test/v1/oauth/authorize' }),
            getJwks: async () => ({ keys: [{ kty: 'RSA', kid: 'k1' }] })
        };
        controller = new WellKnownController(stubSvc);
        res = {
            _status: null, _body: null,
            status(s) { this._status = s; return this; },
            json(b) { this._body = b; return this; }
        };
    });

    describe('getMetadata', () => {

        it('200 + metadata JSON 응답', async () => {
            await controller.getMetadata({}, res);
            assert.strictEqual(res._status, 200);
            assert.strictEqual(res._body.issuer, 'https://test');
            assert.strictEqual(res._body.authorization_endpoint, 'https://test/v1/oauth/authorize');
        });
    });

    describe('getJwks', () => {

        it('200 + JWKS JSON 응답', async () => {
            await controller.getJwks({}, res);
            assert.strictEqual(res._status, 200);
            assert.strictEqual(res._body.keys.length, 1);
            assert.strictEqual(res._body.keys[0].kid, 'k1');
        });
    });
});
