
const assert = require('assert');
const EventDetailOpenController = require('../../../controllers/openapi/eventDetailOpenController');
const Errors = require('../../../models/Errors');
const StubServices = require('../../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('EventDetailOpenController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.EventDetailData();
        controller = new EventDetailOpenController(stubService);
    });


    describe('getData', () => {

        it('id 없으면 BadRequest', async () => {
            const req = { params: {} };
            const res = makeRes();
            await assert.rejects(controller.getData(req, res), Errors.BadRequest);
        });

        it('정상(active) → 200, isDone=false 로 service 호출', async () => {
            const req = { params: { id: 'evt1' } };
            const res = makeRes();
            await controller.getData(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('정상(done) → 200, isDone=true 로 service 호출', async () => {
            let called = null;
            stubService.findData = async (id, isDone) => { called = { id, isDone }; return stubService.dataResult; };
            const req = { params: { id: 'done1' }, isDoneDetail: true };
            const res = makeRes();
            await controller.getData(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(called, { id: 'done1', isDone: true });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'evt1' } };
            const res = makeRes();
            await assert.rejects(controller.getData(req, res), Errors.Application);
        });
    });


    describe('putData', () => {

        it('id 없으면 BadRequest', async () => {
            const req = { params: {}, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putData(req, res), Errors.BadRequest);
        });

        it('정상(active) → 201', async () => {
            const req = { params: { id: 'evt1' }, body: { memo: 'x' } };
            const res = makeRes();
            await controller.putData(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('정상(done) → 201, isDone=true 로 service 호출', async () => {
            let called = null;
            stubService.putData = async (id, payload, isDone) => { called = { id, payload, isDone }; return stubService.dataResult; };
            const req = { params: { id: 'done1' }, body: { memo: 'x' }, isDoneDetail: true };
            const res = makeRes();
            await controller.putData(req, res);
            assert.equal(res.statusCode, 201);
            assert.equal(called.isDone, true);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'evt1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putData(req, res), Errors.Application);
        });
    });


    describe('deleteData', () => {

        it('id 없으면 BadRequest', async () => {
            const req = { params: {} };
            const res = makeRes();
            await assert.rejects(controller.deleteData(req, res), Errors.BadRequest);
        });

        it('정상(active) → 200 {status:ok}', async () => {
            const req = { params: { id: 'evt1' } };
            const res = makeRes();
            await controller.deleteData(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { status: 'ok' });
        });

        it('정상(done) → 200, isDone=true 로 service 호출', async () => {
            let called = null;
            stubService.removeData = async (id, isDone) => { called = { id, isDone }; };
            const req = { params: { id: 'done1' }, isDoneDetail: true };
            const res = makeRes();
            await controller.deleteData(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(called.isDone, true);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'evt1' } };
            const res = makeRes();
            await assert.rejects(controller.deleteData(req, res), Errors.Application);
        });
    });
});
