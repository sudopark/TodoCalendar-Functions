const assert = require('assert');
const { authedClient, authedClientV2, publicClientV2 } = require('./helpers/request');

describe('2nd gen function (apiV2)', function () {
    describe('auth chain', function () {
        it('rejects unauthenticated request with 403', async function () {
            const res = await publicClientV2().get('/v1/todos');
            assert.strictEqual(res.status, 403);
        });

        it('serves Swagger UI without auth', async function () {
            const res = await publicClientV2().get('/api-docs/');
            assert.strictEqual(res.status, 200);
        });
    });

    describe('routing & response parity with 1st gen', function () {
        it('handles authenticated GET on /v1 path', async function () {
            const now = Math.floor(Date.now() / 1000);
            const res = await authedClientV2().get('/v1/todos/', {
                params: { lower: now, upper: now + 172800 }
            });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data));
        });

        it('returns same shape as 1st gen for the same GET', async function () {
            const now = Math.floor(Date.now() / 1000);
            const params = { lower: now, upper: now + 172800 };
            const [v1Res, v2Res] = await Promise.all([
                authedClient().get('/v1/todos/', { params }),
                authedClientV2().get('/v1/todos/', { params })
            ]);
            assert.strictEqual(v1Res.status, v2Res.status);
            assert.deepStrictEqual(
                Object.keys(v1Res.data[0] ?? {}).sort(),
                Object.keys(v2Res.data[0] ?? {}).sort()
            );
        });

        it('handles authenticated POST on /v1 path (create todo)', async function () {
            const res = await authedClientV2().post('/v1/todos/todo', {
                name: 'gen2 E2E Todo',
                event_tag_id: 'e2e-default-tag-001',
                event_time: {
                    time_type: 'at',
                    timestamp: Math.floor(Date.now() / 1000) + 86400
                }
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uuid);
            assert.strictEqual(res.data.name, 'gen2 E2E Todo');
        });

        it('handles authenticated POST on /v2 path (create todo via v2 route)', async function () {
            const res = await authedClientV2().post('/v2/todos/todo', {
                name: 'gen2 + v2-route Todo'
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uuid);
        });
    });
});
