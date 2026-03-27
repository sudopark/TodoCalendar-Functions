const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Migration API', function () {
    describe('POST /v1/migration/event_tags', function () {
        it('should migrate event tags', async function () {
            const res = await authedClient().post('/v1/migration/event_tags', {
                'migrate-tag-001': { name: 'Migrated Tag', color_hex: '#AABBCC' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/todos', function () {
        it('should migrate todos', async function () {
            const res = await authedClient().post('/v1/migration/todos', {
                'migrate-todo-001': {
                    name: 'Migrated Todo',
                    event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
                }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/schedules', function () {
        it('should migrate schedules', async function () {
            const res = await authedClient().post('/v1/migration/schedules', {
                'migrate-schedule-001': {
                    name: 'Migrated Schedule',
                    event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) + 86400 }
                }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/event_details', function () {
        it('should migrate event details', async function () {
            const res = await authedClient().post('/v1/migration/event_details', {
                'migrate-todo-001': { memo: 'migrated memo', place: 'Seoul' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/todos/done', function () {
        it('should migrate done todos', async function () {
            const res = await authedClient().post('/v1/migration/todos/done', {
                'migrate-done-001': {
                    name: 'Migrated Done Todo',
                    done_at: Math.floor(Date.now() / 1000)
                }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });

    describe('POST /v1/migration/todos/done/details', function () {
        it('should migrate done todo details', async function () {
            const res = await authedClient().post('/v1/migration/todos/done/details', {
                'migrate-done-001': { memo: 'done memo' }
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.status, 'ok');
        });
    });
});
