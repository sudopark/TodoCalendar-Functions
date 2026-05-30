
const assert = require('assert');
const ForemostOpenController = require('../../../controllers/openapi/foremostOpenController');
const Errors = require('../../../models/Errors');
const StubServices = require('../../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('ForemostOpenController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.ForemostEvent();
        controller = new ForemostOpenController(stubService);
    });


    describe('getForemostEvent', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null };
            const res = makeRes();
            await assert.rejects(controller.getForemostEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { openUserId: 'uid' };
            const res = makeRes();
            await controller.getForemostEvent(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { event_id: 'evt1', is_todo: false, event: { uuid: 'evt1' } });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid' };
            const res = makeRes();
            await assert.rejects(controller.getForemostEvent(req, res), Errors.Application);
        });
    });


    describe('updateForemostEvent', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, body: { event_id: 'evt1', is_todo: true } };
            const res = makeRes();
            await assert.rejects(controller.updateForemostEvent(req, res), Errors.BadRequest);
        });

        it('event_id가 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: { is_todo: true } };
            const res = makeRes();
            await assert.rejects(controller.updateForemostEvent(req, res), Errors.BadRequest);
        });

        it('is_todo가 null이면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: { event_id: 'evt1', is_todo: null } };
            const res = makeRes();
            await assert.rejects(controller.updateForemostEvent(req, res), Errors.BadRequest);
        });

        it('is_todo가 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: { event_id: 'evt1' } };
            const res = makeRes();
            await assert.rejects(controller.updateForemostEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 201, is_todo boolean 그대로 service 전달', async () => {
            const req = { openUserId: 'uid', body: { event_id: 'evt1', is_todo: false } };
            const res = makeRes();
            await controller.updateForemostEvent(req, res);
            assert.equal(res.statusCode, 201);
            assert.deepEqual(res.body, { event_id: 'evt1', is_todo: false, event: { uuid: 'evt1' } });
            assert.deepEqual(stubService.lastUpdatePayload, { event_id: 'evt1', is_todo: false });
        });

        it('is_todo=true 도 boolean 그대로 전달', async () => {
            const req = { openUserId: 'uid', body: { event_id: 'evt1', is_todo: true } };
            const res = makeRes();
            await controller.updateForemostEvent(req, res);
            assert.equal(res.statusCode, 201);
            assert.deepEqual(stubService.lastUpdatePayload, { event_id: 'evt1', is_todo: true });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', body: { event_id: 'evt1', is_todo: true } };
            const res = makeRes();
            await assert.rejects(controller.updateForemostEvent(req, res), Errors.Application);
        });
    });


    describe('removeForemostEvent', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null };
            const res = makeRes();
            await assert.rejects(controller.removeForemostEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 200 {status:ok}', async () => {
            const req = { openUserId: 'uid' };
            const res = makeRes();
            await controller.removeForemostEvent(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { status: 'ok' });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid' };
            const res = makeRes();
            await assert.rejects(controller.removeForemostEvent(req, res), Errors.Application);
        });
    });
});
