const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('ForemostEvent API', function () {
    let todoId;

    before(async function () {
        const res = await authedClient().post('/v1/todos/todo', {
            name: 'Todo for Foremost Test',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
        });
        todoId = res.data.uuid;
    });

    describe('PUT /v1/foremost/event', function () {
        it('should set foremost event', async function () {
            const res = await authedClient().put('/v1/foremost/event', {
                event_id: todoId,
                is_todo: true
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.event_id, todoId);
        });

        it('should fail without event_id', async function () {
            const res = await authedClient().put('/v1/foremost/event', {});
            assert.strictEqual(res.status, 400);
        });
    });

    describe('GET /v1/foremost/event', function () {
        it('should get foremost event', async function () {
            const res = await authedClient().get('/v1/foremost/event');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.event_id, todoId);
        });
    });

    describe('DELETE /v1/foremost/event', function () {
        it('should clear foremost event', async function () {
            const res = await authedClient().delete('/v1/foremost/event');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
