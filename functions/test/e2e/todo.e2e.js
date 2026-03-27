const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Todo API', function () {
    let createdTodoId;

    describe('v1', function () {
        describe('POST /v1/todos/todo', function () {
            it('should create a todo', async function () {
                const res = await authedClient().post('/v1/todos/todo', {
                    name: 'E2E Test Todo',
                    event_tag_id: 'e2e-default-tag-001',
                    event_time: {
                        time_type: 'at',
                        timestamp: Math.floor(Date.now() / 1000) + 86400
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
                assert.strictEqual(res.data.name, 'E2E Test Todo');
                createdTodoId = res.data.uuid;
            });

            it('should fail without name', async function () {
                const res = await authedClient().post('/v1/todos/todo', {});
                assert.strictEqual(res.status, 400);
            });
        });

        describe('GET /v1/todos/todo/:id', function () {
            it('should get a todo by id', async function () {
                const res = await authedClient().get(`/v1/todos/todo/${createdTodoId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.uuid, createdTodoId);
            });

            it('should return 404 for non-existent id', async function () {
                const res = await authedClient().get('/v1/todos/todo/non-existent-id');
                assert.strictEqual(res.status, 404);
            });
        });

        describe('GET /v1/todos/', function () {
            it('should return todos in time range', async function () {
                const now = Math.floor(Date.now() / 1000);
                const res = await authedClient().get('/v1/todos/', {
                    params: { lower: now, upper: now + 172800 }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
            });
        });

        describe('PUT /v1/todos/todo/:id', function () {
            it('should update a todo', async function () {
                const res = await authedClient().put(`/v1/todos/todo/${createdTodoId}`, {
                    name: 'Updated E2E Todo',
                    event_time: {
                        time_type: 'at',
                        timestamp: Math.floor(Date.now() / 1000) + 172800
                    }
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Updated E2E Todo');
            });
        });

        describe('PATCH /v1/todos/todo/:id', function () {
            it('should patch a todo', async function () {
                const res = await authedClient().patch(`/v1/todos/todo/${createdTodoId}`, {
                    name: 'Patched E2E Todo'
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Patched E2E Todo');
            });
        });

        describe('POST /v1/todos/todo/:id/complete', function () {
            it('should complete a todo', async function () {
                const todoRes = await authedClient().get(`/v1/todos/todo/${createdTodoId}`);
                const res = await authedClient().post(`/v1/todos/todo/${createdTodoId}/complete`, {
                    origin: todoRes.data
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.done);
                assert.ok(res.data.done.uuid);
            });
        });

        describe('DELETE /v1/todos/todo/:id', function () {
            it('should delete a todo', async function () {
                const createRes = await authedClient().post('/v1/todos/todo', {
                    name: 'Todo to Delete'
                });
                const res = await authedClient().delete(`/v1/todos/todo/${createRes.data.uuid}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        it('should create a todo via v2', async function () {
            const res = await authedClient().post('/v2/todos/todo', {
                name: 'V2 Todo'
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.data.uuid);
        });
    });
});
