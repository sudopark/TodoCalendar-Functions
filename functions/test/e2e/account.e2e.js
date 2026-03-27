const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Account API', function () {
    describe('PUT /v1/accounts/info', function () {
        it('should create or update account info', async function () {
            const res = await authedClient().put('/v1/accounts/info');
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uid);
        });
    });

    describe('DELETE /v1/accounts/account', function () {
        it('should delete account', async function () {
            await authedClient().put('/v1/accounts/info');
            const res = await authedClient().delete('/v1/accounts/account');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
