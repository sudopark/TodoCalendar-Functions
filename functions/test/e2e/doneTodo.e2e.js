const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('DoneTodo API', function () {
    let doneTodoId;
    let originalTodoId;

    before(async function () {
        const todoRes = await authedClient().post('/v1/todos/todo', {
            name: 'Todo to Complete for DoneTodo Test',
            event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 3600 }
        });
        originalTodoId = todoRes.data.uuid;

        const doneRes = await authedClient().post(`/v1/todos/todo/${originalTodoId}/complete`, {
            origin: todoRes.data
        });
        doneTodoId = doneRes.data.uuid;
    });

    describe('v1', function () {
        describe('GET /v1/todos/dones/', function () {
            it('should return paginated done todos', async function () {
                const res = await authedClient().get('/v1/todos/dones/', {
                    params: { size: 10 }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.contents !== undefined || Array.isArray(res.data));
            });
        });

        describe('GET /v1/todos/dones/:id', function () {
            it('should get a done todo by id', async function () {
                const res = await authedClient().get(`/v1/todos/dones/${doneTodoId}`);
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.uuid);
            });
        });

        describe('PUT /v1/todos/dones/:id', function () {
            it('should update a done todo', async function () {
                const res = await authedClient().put(`/v1/todos/dones/${doneTodoId}`, {
                    name: 'Updated Done Todo'
                });
                assert.strictEqual(res.status, 200);
            });
        });

        describe('POST /v1/todos/dones/:id/revert', function () {
            it('should revert a done todo back to active', async function () {
                const todoRes = await authedClient().post('/v1/todos/todo', {
                    name: 'Todo for Revert Test'
                });
                const doneRes = await authedClient().post(`/v1/todos/todo/${todoRes.data.uuid}/complete`, {
                    origin: todoRes.data
                });
                const res = await authedClient().post(`/v1/todos/dones/${doneRes.data.uuid}/revert`);
                assert.strictEqual(res.status, 201);
            });
        });

        describe('DELETE /v1/todos/dones/:id', function () {
            it('should delete a done todo', async function () {
                const todoRes = await authedClient().post('/v1/todos/todo', {
                    name: 'Todo for Delete Done Test'
                });
                const doneRes = await authedClient().post(`/v1/todos/todo/${todoRes.data.uuid}/complete`, {
                    origin: todoRes.data
                });
                const res = await authedClient().delete(`/v1/todos/dones/${doneRes.data.uuid}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        describe('POST /v2/todos/dones/:id/revert', function () {
            it('should revert via v2 endpoint', async function () {
                const todoRes = await authedClient().post('/v2/todos/todo', {
                    name: 'V2 Revert Test Todo'
                });
                const doneRes = await authedClient().post(`/v2/todos/todo/${todoRes.data.uuid}/complete`, {
                    origin: todoRes.data
                });
                const res = await authedClient().post(`/v2/todos/dones/${doneRes.data.done.uuid}/revert`);
                assert.strictEqual(res.status, 201);
            });

            it('preserves name and event_time when reverting a done todo with time info', async function () {
                const todoRes = await authedClient().post('/v2/todos/todo', {
                    name: 'V2 Revert with time',
                    event_time: { time_type: 'at', timestamp: 1776351600 }
                });
                const todoId = todoRes.data.uuid;

                const { uuid, ...originWithoutUuid } = todoRes.data;
                const doneRes = await authedClient().post(`/v2/todos/todo/${todoId}/complete`, {
                    origin: originWithoutUuid
                });
                const doneId = doneRes.data.done.uuid;

                const revertRes = await authedClient().post(`/v2/todos/dones/${doneId}/revert`);

                assert.strictEqual(
                    revertRes.status,
                    201,
                    `revert should succeed, got status=${revertRes.status} data=${JSON.stringify(revertRes.data)}`
                );
                assert.strictEqual(revertRes.data.todo?.name, 'V2 Revert with time');
                assert.deepStrictEqual(revertRes.data.todo?.event_time, {
                    time_type: 'at',
                    timestamp: 1776351600
                });
                assert.notStrictEqual(
                    revertRes.data.todo?.is_current,
                    true,
                    'is_current should not be true when event_time is present'
                );
            });
        });

        describe('DELETE /v2/todos/dones/:id', function () {
            it('should delete done todo and its associated detail', async function () {
                const todoRes = await authedClient().post('/v2/todos/todo', {
                    name: 'V2 Delete Done Todo with Detail'
                });
                const todoId = todoRes.data.uuid;

                await authedClient().put(`/v1/event_details/${todoId}`, {
                    memo: 'detail memo',
                    place: { place_name: 'home' }
                });

                const doneRes = await authedClient().post(`/v2/todos/todo/${todoId}/complete`, {
                    origin: todoRes.data
                });
                const doneId = doneRes.data.done.uuid;

                const beforeDelete = await authedClient().get(`/v1/event_details/done/${doneId}`);
                assert.strictEqual(beforeDelete.data.memo, 'detail memo', 'precondition: done detail should exist');

                const deleteRes = await authedClient().delete(`/v2/todos/dones/${doneId}`);
                assert.strictEqual(deleteRes.status, 200);
                assert.strictEqual(deleteRes.data.status, 'ok');

                const afterDelete = await authedClient().get(`/v1/event_details/done/${doneId}`);
                assert.strictEqual(afterDelete.data.memo, undefined, 'done detail should be removed');
                assert.strictEqual(afterDelete.data.place, undefined, 'done detail should be removed');
            });
        });
    });
});
