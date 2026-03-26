const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('EventTag API', function () {
    let createdTagId;

    describe('v1', function () {
        describe('POST /v1/tags/tag', function () {
            it('should create a tag', async function () {
                const res = await authedClient().post('/v1/tags/tag', {
                    name: 'Work',
                    color_hex: '#0000FF'
                });
                assert.strictEqual(res.status, 201);
                assert.ok(res.data.uuid);
                assert.strictEqual(res.data.name, 'Work');
                createdTagId = res.data.uuid;
            });
        });

        describe('PUT /v1/tags/tag/:id', function () {
            it('should update a tag', async function () {
                const res = await authedClient().put(`/v1/tags/tag/${createdTagId}`, {
                    name: 'Work Updated',
                    color_hex: '#00FF00'
                });
                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.name, 'Work Updated');
            });
        });

        describe('GET /v1/tags/all', function () {
            it('should return all tags', async function () {
                const res = await authedClient().get('/v1/tags/all');
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
                assert.ok(res.data.length > 0);
            });
        });

        describe('GET /v1/tags/', function () {
            it('should return tags by ids', async function () {
                const res = await authedClient().get('/v1/tags/', {
                    params: { ids: createdTagId }
                });
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.data));
            });
        });

        describe('DELETE /v1/tags/tag/:id', function () {
            it('should delete a tag', async function () {
                const res = await authedClient().delete(`/v1/tags/tag/${createdTagId}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.status, 'ok');
            });
        });
    });

    describe('v2', function () {
        let v2TagId;

        before(async function () {
            const res = await authedClient().post('/v2/tags/tag', {
                name: 'V2 Tag',
                color_hex: '#FF00FF'
            });
            v2TagId = res.data.uuid;
        });

        describe('DELETE /v2/tags/tag_and_events/:id', function () {
            it('should delete tag and associated events', async function () {
                const res = await authedClient().delete(`/v2/tags/tag_and_events/${v2TagId}`);
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.todos !== undefined);
                assert.ok(res.data.schedules !== undefined);
            });
        });
    });
});
