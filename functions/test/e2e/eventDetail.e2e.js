const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('EventDetail API', function () {
    let todoId;
    let doneTodoId;

    before(async function () {
        const todoRes = await authedClient().post('/v1/todos/todo', {
            name: 'Todo for Detail Test',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
        });
        todoId = todoRes.data.uuid;

        const todo2Res = await authedClient().post('/v1/todos/todo', {
            name: 'Todo for Done Detail Test'
        });
        const doneRes = await authedClient().post(`/v1/todos/todo/${todo2Res.data.uuid}/complete`, {
            origin: todo2Res.data
        });
        doneTodoId = doneRes.data.uuid;
    });

    describe('Active event details', function () {
        describe('PUT /v1/event_details/:id', function () {
            it('should create/update event detail', async function () {
                const res = await authedClient().put(`/v1/event_details/${todoId}`, {
                    place: 'Office',
                    url: 'https://example.com',
                    memo: 'Test memo'
                });
                assert.strictEqual(res.status, 201);
            });
        });

        describe('GET /v1/event_details/:id', function () {
            it('should get event detail', async function () {
                const res = await authedClient().get(`/v1/event_details/${todoId}`);
                assert.strictEqual(res.status, 200);
            });
        });

        describe('DELETE /v1/event_details/:id', function () {
            it('should delete event detail', async function () {
                const res = await authedClient().delete(`/v1/event_details/${todoId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('Done event details', function () {
        describe('PUT /v1/event_details/done/:id', function () {
            it('should create/update done event detail', async function () {
                const res = await authedClient().put(`/v1/event_details/done/${doneTodoId}`, {
                    memo: 'Done todo memo'
                });
                assert.strictEqual(res.status, 201);
            });
        });

        describe('GET /v1/event_details/done/:id', function () {
            it('should get done event detail', async function () {
                const res = await authedClient().get(`/v1/event_details/done/${doneTodoId}`);
                assert.strictEqual(res.status, 200);
            });
        });

        describe('DELETE /v1/event_details/done/:id', function () {
            it('should delete done event detail', async function () {
                const res = await authedClient().delete(`/v1/event_details/done/${doneTodoId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });
});
