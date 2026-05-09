const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

describe('openAPI /v2/open/todos', function () {

    let client;
    let createdId;

    before(function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });
    });

    it('POST / — todo 생성', async function () {
        const res = await client.post('/v2/open/todos/', {
            name: 'openAPI E2E Todo',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.uuid);
        createdId = res.data.uuid;
    });

    it('GET /:id — 단건 조회', async function () {
        const res = await client.get(`/v2/open/todos/${createdId}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.uuid, createdId);
    });

    it('GET / — current(미래) 조회', async function () {
        const res = await client.get('/v2/open/todos/');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data));
    });

    it('GET /uncompleted — 미완료 조회', async function () {
        const res = await client.get('/v2/open/todos/uncompleted', {
            params: { refTime: Math.floor(Date.now() / 1000) }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data));
    });

    it('PUT /:id — 전체 수정', async function () {
        const res = await client.put(`/v2/open/todos/${createdId}`, {
            name: 'openAPI E2E Todo (updated)',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 7200 }
        });
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.name, 'openAPI E2E Todo (updated)');
    });

    it('PATCH /:id — 부분 수정', async function () {
        const res = await client.patch(`/v2/open/todos/${createdId}`, { name: 'patched' });
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.name, 'patched');
    });

    it('DELETE /:id — 삭제', async function () {
        const res = await client.delete(`/v2/open/todos/${createdId}`);
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(res.data, { status: 'ok' });
    });

    it('POST /:id/replace — 반복 todo 교체 (201, origin 은 origin_next_event_time 으로 업데이트)', async function () {
        const created = await client.post('/v2/open/todos/', {
            name: 'openAPI E2E Todo (origin)',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        assert.strictEqual(created.status, 201);
        const originId = created.data.uuid;
        const res = await client.post(`/v2/open/todos/${originId}/replace`, {
            new: {
                name: 'openAPI E2E Todo (replacement)',
                event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 10800 }
            },
            origin_next_event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 7200 }
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.new_todo);
        assert.ok(res.data.next_repeating);
    });
});
