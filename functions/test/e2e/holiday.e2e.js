const assert = require('assert');
const { publicClient, authedClient } = require('./helpers/request');

describe('Holiday API', function () {
    describe('GET /v1/holiday/', function () {
        it('should return holidays without auth (or 500 if HOLIDAY_API_KEY not set)', async function () {
            const res = await publicClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'ko_KR', code: 'KR' }
            });
            // Holiday API calls external Google Calendar API.
            // Returns 200 if HOLIDAY_API_KEY is set, 500 if not.
            assert.ok([200, 500].includes(res.status));
        });

        it('should fail without required params', async function () {
            const res = await publicClient().get('/v1/holiday/');
            assert.ok(res.status >= 400);
        });

        it('should also work with auth header (or 500 if HOLIDAY_API_KEY not set)', async function () {
            const res = await authedClient().get('/v1/holiday/', {
                params: { year: 2026, locale: 'en_US', code: 'US' }
            });
            assert.ok([200, 500].includes(res.status));
        });
    });
});
