const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('User API', function () {
    describe('PUT /v1/user/notification', function () {
        it('should register notification token', async function () {
            const res = await authedClient().put('/v1/user/notification',
                { fcm_token: 'test-fcm-token-123', device_model: 'iPhone' },
                { headers: { 'device_id': 'test-device-001' } }
            );
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });

        it('should fail without device_id header', async function () {
            const res = await authedClient().put('/v1/user/notification',
                { fcm_token: 'test-fcm-token-123' }
            );
            assert.strictEqual(res.status, 400);
        });
    });

    describe('DELETE /v1/user/notification', function () {
        it('should delete notification token', async function () {
            await authedClient().put('/v1/user/notification',
                { fcm_token: 'test-fcm-token-123' },
                { headers: { 'device_id': 'test-device-001' } }
            );
            const res = await authedClient().delete('/v1/user/notification', {
                headers: { 'device_id': 'test-device-001' }
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
