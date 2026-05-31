const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

// foremost 사이클: todo 생성 → PUT 으로 foremost 지정 → GET 조회 → DELETE 해제.
// scope: GET=read:calendar, PUT/DELETE=write:calendar.
describe('openAPI /v2/open/foremost', function () {

    let client;
    let todoId;

    before(async function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });

        const created = await client.post('/v2/open/todos/', {
            name: 'openAPI E2E Foremost',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
        });
        assert.strictEqual(created.status, 201, `todo create failed: ${JSON.stringify(created.data)}`);
        todoId = created.data.uuid;
    });

    it('GET /event — 미지정 시 빈 객체', async function () {
        const res = await client.get('/v2/open/foremost/event');
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(res.data, {});
    });

    it('PUT /event — foremost 지정 (201)', async function () {
        const res = await client.put('/v2/open/foremost/event', { event_id: todoId, is_todo: true });
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.event_id, todoId);
        assert.strictEqual(res.data.is_todo, true);
    });

    it('GET /event — 지정된 foremost 조회 (200)', async function () {
        const res = await client.get('/v2/open/foremost/event');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.event_id, todoId);
    });

    it('DELETE /event — 해제 (200)', async function () {
        const res = await client.delete('/v2/open/foremost/event');
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(res.data, { status: 'ok' });
    });

    it('PUT /event — write scope 없으면 403', async function () {
        const readOnly = openClient({
            pat: defaultMcpPat(),
            userToken: signUserToken({ sub: TEST_USER_UID, scope: ['read:calendar'] })
        });
        const res = await readOnly.put('/v2/open/foremost/event', { event_id: todoId, is_todo: true });
        assert.strictEqual(res.status, 403);
    });
});
