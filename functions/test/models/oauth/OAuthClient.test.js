const assert = require('assert');
const OAuthClient = require('../../../models/oauth/OAuthClient');

describe('OAuthClient', () => {

    const sampleData = {
        clientName: 'Claude Desktop',
        redirectUris: ['http://127.0.0.1:54321/callback'],
        scope: ['read:calendar', 'write:calendar'],
        tokenEndpointAuthMethod: 'none',
        grantTypes: ['authorization_code'],
        responseTypes: ['code'],
        createdAt: 1700000000000,
        lastUsedAt: null,
        dedupHash: 'hash-abc'
    };

    describe('fromData', () => {

        it('기본 필드로 생성', () => {
            const c = OAuthClient.fromData('client-1', sampleData);
            assert.strictEqual(c.id, 'client-1');
            assert.strictEqual(c.clientName, 'Claude Desktop');
            assert.deepStrictEqual(c.redirectUris, ['http://127.0.0.1:54321/callback']);
            assert.deepStrictEqual(c.scope, ['read:calendar', 'write:calendar']);
            assert.strictEqual(c.tokenEndpointAuthMethod, 'none');
            assert.strictEqual(c.lastUsedAt, null);
            assert.strictEqual(c.dedupHash, 'hash-abc');
        });

        it('lastUsedAt 없을 때 null 기본값', () => {
            const { lastUsedAt, ...rest } = sampleData;
            const c = OAuthClient.fromData('client-1', rest);
            assert.strictEqual(c.lastUsedAt, null);
        });
    });

    describe('toJSON (RFC 7591)', () => {

        it('등록 응답 필드', () => {
            const c = OAuthClient.fromData('client-1', sampleData);
            const json = c.toJSON();
            assert.deepStrictEqual(json, {
                client_id: 'client-1',
                client_id_issued_at: 1700000000,
                client_name: 'Claude Desktop',
                redirect_uris: ['http://127.0.0.1:54321/callback'],
                scope: 'read:calendar write:calendar',
                token_endpoint_auth_method: 'none',
                grant_types: ['authorization_code'],
                response_types: ['code']
            });
        });

        it('createdAt 이 Date 객체여도 epoch seconds 로 변환', () => {
            const c = OAuthClient.fromData('client-1', {
                ...sampleData,
                createdAt: new Date(1700000000000)
            });
            assert.strictEqual(c.toJSON().client_id_issued_at, 1700000000);
        });
    });
});
