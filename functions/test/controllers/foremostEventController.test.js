
const assert = require('assert');
const ForemostEventController = require('../../controllers/foremostEventController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('ForemostEventController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.ForemostEvent();
        controller = new ForemostEventController(stubService);
    });


    describe('getForemostEvent', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null } };
                const res = makeRes();
                try {
                    await controller.getForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('foremost 이벤트를 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();

                await controller.getForemostEvent(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { event_id: 'evt1', is_todo: false, event: { uuid: 'evt1' } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();
                try {
                    await controller.getForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('updateForemostEvent', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: { event_id: 'evt1', is_todo: 'true' } };
                const res = makeRes();
                try {
                    await controller.updateForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('is_todo가 null이면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, body: { event_id: 'evt1', is_todo: null } };
                const res = makeRes();
                try {
                    await controller.updateForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('is_todo가 없으면 BadRequest', async () => {
                // undefined == null → true
                const req = { auth: { uid: 'uid' }, body: { event_id: 'evt1' } };
                const res = makeRes();
                try {
                    await controller.updateForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 foremost 이벤트를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { event_id: 'evt1', is_todo: 'false' } };
                const res = makeRes();

                await controller.updateForemostEvent(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { event_id: 'evt1', is_todo: false, event: { uuid: 'evt1' } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: { event_id: 'evt1', is_todo: 'true' } };
                const res = makeRes();
                try {
                    await controller.updateForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('removeForemostEvent', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null } };
                const res = makeRes();
                try {
                    await controller.removeForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();

                await controller.removeForemostEvent(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();
                try {
                    await controller.removeForemostEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
