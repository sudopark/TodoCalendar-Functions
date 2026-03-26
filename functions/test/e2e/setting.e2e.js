const assert = require('assert');
const { authedClient } = require('./helpers/request');

describe('Setting API', function () {
    describe('PATCH /v1/setting/event/tag/default/color', function () {
        it('should update default tag colors', async function () {
            const res = await authedClient().patch('/v1/setting/event/tag/default/color', {
                holiday: '#FF0000',
                default: '#0000FF'
            });
            assert.strictEqual(res.status, 201);
        });
    });

    describe('GET /v1/setting/event/tag/default/color', function () {
        it('should get default tag colors', async function () {
            const res = await authedClient().get('/v1/setting/event/tag/default/color');
            assert.strictEqual(res.status, 200);
        });
    });
});
