const assert = require('assert');
const { publicClient, authedClient } = require('./helpers/request');

describe('Holiday API', function () {
    describe('GET /v1/holiday/', function () {
        it('should return holidays without auth', async function () {
            const res = await publicClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'ko_KR', code: 'KR' }
            });
            assert.strictEqual(res.status, 200);
            assert.ok(res.data);
        });

        it('should fail without required params', async function () {
            const res = await publicClient().get('/v1/holiday/');
            assert.strictEqual(res.status, 400);
        });

        it('should also work with auth header', async function () {
            const res = await authedClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'en_US', code: 'US' }
            });
            assert.strictEqual(res.status, 200);
        });
    });
});
