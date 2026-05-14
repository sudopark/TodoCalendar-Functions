const assert = require('assert');
const { TEST_USER_UID } = require('../seeds/commonData');
const { signUserToken, openClient, defaultMcpPat } = require('../helpers/openClient');

describe('openAPI /v2/open/tags', function () {

    let client;
    let createdId;

    before(function () {
        const userToken = signUserToken({
            sub: TEST_USER_UID,
            scope: ['read:calendar', 'write:calendar']
        });
        client = openClient({ pat: defaultMcpPat(), userToken });
    });

    it('POST / — 태그 생성', async function () {
        const res = await client.post('/v2/open/tags/', {
            name: 'openAPI E2E Tag',
            color_hex: '#00FF00'
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.uuid);
        createdId = res.data.uuid;
    });

    it('GET / — 전체 조회', async function () {
        const res = await client.get('/v2/open/tags/');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data));
        assert.ok(res.data.some((t) => t.uuid === createdId));
    });

    it('PUT /:id — 수정', async function () {
        const res = await client.put(`/v2/open/tags/${createdId}`, {
            name: 'openAPI E2E Tag (updated)',
            color_hex: '#0000FF'
        });
        assert.strictEqual(res.status, 201);
    });

    it('DELETE /:id — 삭제', async function () {
        const res = await client.delete(`/v2/open/tags/${createdId}`);
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(res.data, { status: 'ok' });
    });
});
