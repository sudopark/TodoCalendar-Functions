const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

// done todo 사이클: todo 생성 → complete 로 done 생성됨 → done 단건/리스트/PUT/DELETE/revert.
describe('openAPI /v2/open/todos/dones', function () {

    let client;
    let doneId;

    async function makeAndComplete(name) {
        const created = await client.post('/v2/open/todos/', {
            name,
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        assert.strictEqual(created.status, 201, `todo create failed: ${JSON.stringify(created.data)}`);
        const todo = created.data;
        const completed = await client.post(`/v2/open/todos/${todo.uuid}/complete`, {
            origin: todo,
            next_event_time: null
        });
        assert.strictEqual(completed.status, 201, `complete failed: ${JSON.stringify(completed.data)}`);
        return completed.data.done.uuid;
    }

    before(async function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });
        doneId = await makeAndComplete('openAPI E2E Done — life cycle');
    });

    it('GET / — done 리스트 (size 필수)', async function () {
        const res = await client.get('/v2/open/todos/dones/', { params: { size: 10 } });
        assert.strictEqual(res.status, 200);
    });

    it('GET /:id — done 단건', async function () {
        const res = await client.get(`/v2/open/todos/dones/${doneId}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.uuid, doneId);
    });

    it('PUT /:id — done 메타 수정 (200)', async function () {
        const res = await client.put(`/v2/open/todos/dones/${doneId}`, { name: 'updated done' });
        assert.strictEqual(res.status, 200);
    });

    it('POST /:id/revert — done → active todo 복원 (201)', async function () {
        const res = await client.post(`/v2/open/todos/dones/${doneId}/revert`);
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.todo);
    });

    it('DELETE /:id — done 삭제 (별도 사이클로 done 재생성 후)', async function () {
        const newDoneId = await makeAndComplete('openAPI E2E Done — for delete');
        const res = await client.delete(`/v2/open/todos/dones/${newDoneId}`);
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(res.data, { status: 'ok' });
    });
});
