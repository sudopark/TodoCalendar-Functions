
const assert = require('assert');
const DoneTodoOpenController = require('../../../controllers/openapi/doneTodoOpenController');
const Errors = require('../../../models/Errors');
const StubServices = require('../../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('DoneTodoOpenController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.DoneTodo();
        controller = new DoneTodoOpenController(stubService);
    });


    describe('getDoneTodos', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, query: { size: '10' } };
            const res = makeRes();
            await assert.rejects(controller.getDoneTodos(req, res), Errors.BadRequest);
        });

        it('size 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', query: {} };
            const res = makeRes();
            await assert.rejects(controller.getDoneTodos(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { openUserId: 'uid', query: { size: '10', cursor: '0' } };
            const res = makeRes();
            await controller.getDoneTodos(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', query: { size: '10' } };
            const res = makeRes();
            await assert.rejects(controller.getDoneTodos(req, res), Errors.Application);
        });
    });


    describe('getDoneTodo', () => {

        it('id 없으면 BadRequest', async () => {
            const req = { params: {} };
            const res = makeRes();
            await assert.rejects(controller.getDoneTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { params: { id: 'done1' } };
            const res = makeRes();
            await controller.getDoneTodo(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'done1' } };
            const res = makeRes();
            await assert.rejects(controller.getDoneTodo(req, res), Errors.Application);
        });
    });


    describe('putDoneTodo', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'done1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putDoneTodo(req, res), Errors.BadRequest);
        });

        it('doneEventId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putDoneTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { openUserId: 'uid', params: { id: 'done1' }, body: { name: 'updated' } };
            const res = makeRes();
            await controller.putDoneTodo(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'done1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putDoneTodo(req, res), Errors.Application);
        });
    });


    describe('deleteDoneTodo', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'done1' } };
            const res = makeRes();
            await assert.rejects(controller.deleteDoneTodo(req, res), Errors.BadRequest);
        });

        it('doneEventId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {} };
            const res = makeRes();
            await assert.rejects(controller.deleteDoneTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 200 {status:ok}', async () => {
            const req = { openUserId: 'uid', params: { id: 'done1' } };
            const res = makeRes();
            await controller.deleteDoneTodo(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { status: 'ok' });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'done1' } };
            const res = makeRes();
            await assert.rejects(controller.deleteDoneTodo(req, res), Errors.Application);
        });
    });


    describe('revertDoneTodo', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'done1' } };
            const res = makeRes();
            await assert.rejects(controller.revertDoneTodo(req, res), Errors.BadRequest);
        });

        it('doneEventId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {} };
            const res = makeRes();
            await assert.rejects(controller.revertDoneTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 201 (revertDoneTodoV2 사용)', async () => {
            const req = { openUserId: 'uid', params: { id: 'done1' } };
            const res = makeRes();
            await controller.revertDoneTodo(req, res);
            assert.equal(res.statusCode, 201);
            assert.deepEqual(res.body, { todo: { uuid: 'reverted' }, detail: null });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'done1' } };
            const res = makeRes();
            await assert.rejects(controller.revertDoneTodo(req, res), Errors.Application);
        });
    });
});
