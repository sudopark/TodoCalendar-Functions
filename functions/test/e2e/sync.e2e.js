const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('DataSync API', function () {

    before(async function () {
        await authedClient().post('/v1/tags/tag', {
            name: 'Sync Test Tag',
            color_hex: '#112233'
        });
        await authedClient().post('/v1/todos/todo', {
            name: 'Sync Test Todo'
        });
    });

    describe('GET /v1/sync/check', function () {
        it('should check sync status for EventTag', async function () {
            const res = await authedClient().get('/v1/sync/check', {
                params: { dataType: 'EventTag' }
            });
            assert.strictEqual(res.status, 200);
        });

        it('should check sync status for Todo', async function () {
            const res = await authedClient().get('/v1/sync/check', {
                params: { dataType: 'Todo' }
            });
            assert.strictEqual(res.status, 200);
        });

        it('should fail with invalid dataType', async function () {
            const res = await authedClient().get('/v1/sync/check', {
                params: { dataType: 'Invalid' }
            });
            assert.ok(res.status >= 400);
        });
    });

    describe('GET /v1/sync/start', function () {
        it('should start sync with pagination', async function () {
            const res = await authedClient().get('/v1/sync/start', {
                params: { dataType: 'EventTag', size: 10 }
            });
            assert.strictEqual(res.status, 200);
        });
    });
});
