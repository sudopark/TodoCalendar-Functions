const assert = require('assert');
const { publicClient, authedClient } = require('./helpers/request');

describe('Holiday API', function () {
    describe('GET /v1/holiday/', function () {
        it('should return empty holiday payload without auth in emulator', async function () {
            const res = await publicClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'ko_KR', code: 'KR' }
            });
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.data.items, []);
        });

        it('should fail without required params', async function () {
            const res = await publicClient().get('/v1/holiday/');
            assert.ok(res.status >= 400);
        });

        it('should also work with auth header in emulator', async function () {
            const res = await authedClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'en_US', code: 'US' }
            });
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.data.items, []);
        });
    });
});
