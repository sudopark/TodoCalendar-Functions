
const assert = require('assert');
const EventDetailDataController = require('../../controllers/eventDetailController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('EventDetailDataController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.EventDetailData();
        controller = new EventDetailDataController(stubService);
    });


    describe('putData', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { params: { id: null }, body: { memo: 'note' }, isDoneDetail: false };
                const res = makeRes();
                try {
                    await controller.putData(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('isDoneDetail=false 일 때 새 데이터를 201로 응답', async () => {
                const req = { params: { id: 'evt1' }, body: { memo: 'some memo' }, isDoneDetail: false };
                const res = makeRes();

                await controller.putData(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { eventId: 'evt1', memo: 'some memo' });
            });

            it('isDoneDetail=true 일 때 201로 응답', async () => {
                const req = { params: { id: 'evt1' }, body: { memo: 'some memo' }, isDoneDetail: true };
                const res = makeRes();

                await controller.putData(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { eventId: 'evt1', memo: 'some memo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'evt1' }, body: {}, isDoneDetail: false };
                const res = makeRes();
                try {
                    await controller.putData(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getData', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { params: { id: null }, isDoneDetail: false };
                const res = makeRes();
                try {
                    await controller.getData(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('데이터를 200으로 응답', async () => {
                const req = { params: { id: 'evt1' }, isDoneDetail: false };
                const res = makeRes();

                await controller.getData(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { eventId: 'evt1', memo: 'some memo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'evt1' }, isDoneDetail: false };
                const res = makeRes();
                try {
                    await controller.getData(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('deleteData', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { params: { id: null }, isDoneDetail: false };
                const res = makeRes();
                try {
                    await controller.deleteData(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = { params: { id: 'evt1' }, isDoneDetail: false };
                const res = makeRes();

                await controller.deleteData(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'evt1' }, isDoneDetail: false };
                const res = makeRes();
                try {
                    await controller.deleteData(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
