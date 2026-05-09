const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

// event_details 는 별도 컬렉션. 임의 eventId 만 있으면 active/done detail PUT/GET/DELETE 가능.
// 라우트 분기: '/done/:id' 는 isDoneDetail=true, '/:id' 는 false.
describe('openAPI /v2/open/event_details', function () {

    let client;
    const activeId = 'e2e-open-detail-active';
    const doneId = 'e2e-open-detail-done';

    before(function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });
    });

    describe('active detail (/:id)', function () {
        it('PUT /:id — 생성/수정 (201)', async function () {
            const res = await client.put(`/v2/open/event_details/${activeId}`, {
                memo: 'active memo', place: { name: 'office' }, url: 'https://x.test'
            });
            assert.strictEqual(res.status, 201);
        });

        it('GET /:id — 조회', async function () {
            const res = await client.get(`/v2/open/event_details/${activeId}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.memo, 'active memo');
        });

        it('DELETE /:id — 삭제', async function () {
            const res = await client.delete(`/v2/open/event_details/${activeId}`);
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.data, { status: 'ok' });
        });
    });

    describe('done detail (/done/:id)', function () {
        it('PUT /done/:id — 생성/수정 (201)', async function () {
            const res = await client.put(`/v2/open/event_details/done/${doneId}`, {
                memo: 'done memo'
            });
            assert.strictEqual(res.status, 201);
        });

        it('GET /done/:id — 조회', async function () {
            const res = await client.get(`/v2/open/event_details/done/${doneId}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.memo, 'done memo');
        });

        it('DELETE /done/:id — 삭제', async function () {
            const res = await client.delete(`/v2/open/event_details/done/${doneId}`);
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.data, { status: 'ok' });
        });
    });
});
