const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

describe('openAPI /v2/open/schedules', function () {

    let client;
    let createdId;

    before(function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });
    });

    it('POST / — schedule 생성', async function () {
        const res = await client.post('/v2/open/schedules/', {
            name: 'openAPI E2E Schedule',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.uuid);
        createdId = res.data.uuid;
    });

    it('GET /:id — 단건 조회', async function () {
        const res = await client.get(`/v2/open/schedules/${createdId}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.uuid, createdId);
    });

    it('GET / — 기간 조회', async function () {
        const now = Math.floor(Date.now() / 1000);
        const res = await client.get('/v2/open/schedules/', {
            params: { lower: now, upper: now + 86400 }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data));
    });

    it('PUT /:id — 전체 수정', async function () {
        const res = await client.put(`/v2/open/schedules/${createdId}`, {
            name: 'openAPI E2E Schedule (updated)',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 7200 }
        });
        assert.strictEqual(res.status, 201);
    });

    it('PATCH /:id — 부분 수정', async function () {
        const res = await client.patch(`/v2/open/schedules/${createdId}`, { name: 'patched' });
        assert.strictEqual(res.status, 201);
    });

    it('DELETE /:id — 삭제 (201)', async function () {
        const res = await client.delete(`/v2/open/schedules/${createdId}`);
        assert.strictEqual(res.status, 201);
        assert.deepStrictEqual(res.data, { status: 'ok' });
    });
});
