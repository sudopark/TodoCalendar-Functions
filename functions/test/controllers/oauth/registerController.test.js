const assert = require('assert');
const RegisterController = require('../../../controllers/oauth/registerController');
const OAuthClient = require('../../../models/oauth/OAuthClient');

describe('controllers/oauth/RegisterController', () => {

    let svc;
    let controller;
    let res;

    const makeRes = () => ({
        _status: null, _body: null,
        status(s) { this._status = s; return this; },
        json(b) { this._body = b; return this; }
    });

    beforeEach(() => {
        svc = {
            registerCalls: [],
            async register(payload, ctx) {
                this.registerCalls.push({ payload, ctx });
                return OAuthClient.fromData('client-xyz', {
                    clientName: payload.clientName,
                    redirectUris: payload.redirectUris,
                    scope: payload.scope,
                    tokenEndpointAuthMethod: payload.tokenEndpointAuthMethod,
                    grantTypes: payload.grantTypes,
                    responseTypes: payload.responseTypes,
                    createdAt: 1700000000000,
                    lastUsedAt: null,
                    dedupHash: 'h1'
                });
            }
        };
        controller = new RegisterController(svc);
        res = makeRes();
    });

    it('정상: 201 + RFC 7591 응답 (client.toJSON)', async () => {
        const req = {
            body: {
                client_name: 'Claude Desktop',
                redirect_uris: ['http://127.0.0.1:54321/cb'],
                scope: 'read:calendar write:calendar',
                token_endpoint_auth_method: 'none',
                grant_types: ['authorization_code'],
                response_types: ['code']
            },
            ip: '1.2.3.4'
        };
        await controller.register(req, res);
        assert.strictEqual(res._status, 201);
        assert.strictEqual(res._body.client_id, 'client-xyz');
        assert.strictEqual(res._body.client_name, 'Claude Desktop');
        assert.deepStrictEqual(res._body.redirect_uris, ['http://127.0.0.1:54321/cb']);
        assert.strictEqual(res._body.token_endpoint_auth_method, 'none');
        assert.deepStrictEqual(res._body.grant_types, ['authorization_code']);
    });

    it('snake_case body → service 호출 시 camelCase payload', async () => {
        const req = {
            body: {
                client_name: 'X',
                redirect_uris: ['https://x.com/cb'],
                scope: 'read:calendar',
                token_endpoint_auth_method: 'none',
                grant_types: ['authorization_code'],
                response_types: ['code']
            },
            ip: '1.2.3.4'
        };
        await controller.register(req, res);
        const call = svc.registerCalls[0];
        assert.strictEqual(call.payload.clientName, 'X');
        assert.deepStrictEqual(call.payload.redirectUris, ['https://x.com/cb']);
        assert.strictEqual(call.payload.scope, 'read:calendar');
        assert.strictEqual(call.payload.tokenEndpointAuthMethod, 'none');
        assert.deepStrictEqual(call.payload.grantTypes, ['authorization_code']);
        assert.deepStrictEqual(call.payload.responseTypes, ['code']);
        assert.strictEqual(call.ctx.ip, '1.2.3.4');
    });

    it('service throw 400 → controller 가 Application wrap 후 status 400 유지', async () => {
        svc.register = async () => {
            const e = new Error('bad request');
            e.status = 400;
            e.code = 'InvalidRequest';
            throw e;
        };
        await assert.rejects(
            () => controller.register({ body: {}, ip: '1.1.1.1' }, res),
            e => e.status === 400 && e.code === 'InvalidRequest'
        );
    });

    it('service throw without status → 500 Unknown', async () => {
        svc.register = async () => { throw new Error('boom'); };
        await assert.rejects(
            () => controller.register({ body: {}, ip: '1.1.1.1' }, res),
            e => e.status === 500
        );
    });

    it('req.ip 없으면 unknown 으로 전달', async () => {
        await controller.register({ body: {}, ip: undefined }, res);
        // service 가 throw 안 하도록 위에서 정의된 stub 의 기본 동작
        const call = svc.registerCalls[0];
        assert.strictEqual(call.ctx.ip, 'unknown');
    });
});
