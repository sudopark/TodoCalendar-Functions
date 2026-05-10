const assert = require('assert');
const { authedClient, publicClient } = require('./helpers/request');

describe('v2 mirror smoke (v1-only routers mounted at /v2)', function () {
    describe('PUT /v2/accounts/info', function () {
        it('reaches accountRouter at v2 path', async function () {
            const res = await authedClient().put('/v2/accounts/info');
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uid);
        });
    });

    describe('PUT /v2/user/notification', function () {
        it('reaches userRouter at v2 path', async function () {
            const res = await authedClient().put('/v2/user/notification',
                { fcm_token: 'v2-smoke-token', device_model: 'iPhone' },
                { headers: { 'device_id': 'v2-smoke-device' } }
            );
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('GET /v2/foremost/event', function () {
        it('reaches foremostEventRouter at v2 path', async function () {
            const res = await authedClient().get('/v2/foremost/event');
            assert.strictEqual(res.status, 200);
        });
    });

    describe('PUT /v2/event_details/:id', function () {
        it('reaches eventDetailRouter at v2 path', async function () {
            const res = await authedClient().put('/v2/event_details/v2-smoke-detail', {
                place: 'Smoke',
                memo: 'v2 smoke memo'
            });
            assert.strictEqual(res.status, 201);
        });
    });

    describe('POST /v2/migration/event_tags', function () {
        it('reaches migrationRouter at v2 path', async function () {
            const res = await authedClient().post('/v2/migration/event_tags', {
                'v2-smoke-tag': { name: 'V2 Smoke Tag', color_hex: '#000000' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('GET /v2/setting/event/tag/default/color', function () {
        it('reaches settingRouter at v2 path', async function () {
            const res = await authedClient().get('/v2/setting/event/tag/default/color');
            assert.strictEqual(res.status, 200);
        });
    });

    describe('GET /v2/holiday/', function () {
        it('reaches holidayRouter at v2 path (no auth)', async function () {
            const res = await publicClient().get('/v2/holiday/', {
                params: { year: 2026, locale: 'ko_KR', code: 'KR' }
            });
            assert.ok([200, 500].includes(res.status));
        });
    });

    describe('GET /v2/sync/check', function () {
        it('reaches syncRouter at v2 path', async function () {
            const res = await authedClient().get('/v2/sync/check', {
                params: { dataType: 'EventTag' }
            });
            assert.strictEqual(res.status, 200);
        });
    });
});
