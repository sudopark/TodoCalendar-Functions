
const assert = require('assert');
const TagOpenController = require('../../../controllers/openapi/tagOpenController');
const Errors = require('../../../models/Errors');
const StubServices = require('../../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('TagOpenController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.EventTag();
        controller = new TagOpenController(stubService);
    });


    describe('getAllTags', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null };
            const res = makeRes();
            await assert.rejects(controller.getAllTags(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { openUserId: 'uid' };
            const res = makeRes();
            await controller.getAllTags(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid' };
            const res = makeRes();
            await assert.rejects(controller.getAllTags(req, res), Errors.Application);
        });
    });


    describe('postEventTag', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, body: { name: 'tag' } };
            const res = makeRes();
            await assert.rejects(controller.postEventTag(req, res), Errors.BadRequest);
        });

        it('name 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: {} };
            const res = makeRes();
            await assert.rejects(controller.postEventTag(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', body: { name: 'tag', color_hex: '#FFF' } };
            const res = makeRes();
            await controller.postEventTag(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', body: { name: 'tag' } };
            const res = makeRes();
            await assert.rejects(controller.postEventTag(req, res), Errors.Application);
        });
    });


    describe('putEventTag', () => {

        it('tagId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: { name: 'updated' } };
            const res = makeRes();
            await assert.rejects(controller.putEventTag(req, res), Errors.BadRequest);
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'tag1' }, body: { name: 'u' } };
            const res = makeRes();
            await assert.rejects(controller.putEventTag(req, res), Errors.BadRequest);
        });

        it('name 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: { id: 'tag1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putEventTag(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', params: { id: 'tag1' }, body: { name: 'updated' } };
            const res = makeRes();
            await controller.putEventTag(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'tag1' }, body: { name: 'u' } };
            const res = makeRes();
            await assert.rejects(controller.putEventTag(req, res), Errors.Application);
        });
    });


    describe('deleteTag', () => {

        it('tagId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {} };
            const res = makeRes();
            await assert.rejects(controller.deleteTag(req, res), Errors.BadRequest);
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'tag1' } };
            const res = makeRes();
            await assert.rejects(controller.deleteTag(req, res), Errors.BadRequest);
        });

        it('정상 → 200 {status:ok}', async () => {
            const req = { openUserId: 'uid', params: { id: 'tag1' } };
            const res = makeRes();
            await controller.deleteTag(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { status: 'ok' });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'tag1' } };
            const res = makeRes();
            await assert.rejects(controller.deleteTag(req, res), Errors.Application);
        });
    });
});
