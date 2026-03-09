
const assert = require('assert');
const DoneTodoController = require('../../controllers/doneTodoController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('DoneTodoController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.DoneTodo();
        controller = new DoneTodoController(stubService);
    });


    describe('getDoneTodos', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: { size: '5' } };
                const res = makeRes();
                try {
                    await controller.getDoneTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('size 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: {} };
                const res = makeRes();
                try {
                    await controller.getDoneTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('페이지 결과를 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, query: { size: '5' } };
                const res = makeRes();

                await controller.getDoneTodos(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'done1', name: 'done todo' }]);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, query: { size: '5' } };
                const res = makeRes();
                try {
                    await controller.getDoneTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getDoneTodo', () => {

        describe('입력값 검증', () => {

            it('doneId 없으면 BadRequest', async () => {
                const req = { params: { id: null } };
                const res = makeRes();
                try {
                    await controller.getDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('doneTodo를 200으로 응답', async () => {
                const req = { params: { id: 'done1' } };
                const res = makeRes();

                await controller.getDoneTodo(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { uuid: 'done1', name: 'done todo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'done1' } };
                const res = makeRes();
                try {
                    await controller.getDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('deleteDoneTodos', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: {} };
                const res = makeRes();
                try {
                    await controller.deleteDoneTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, query: { past_than: '1000' } };
                const res = makeRes();

                await controller.deleteDoneTodos(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, query: {} };
                const res = makeRes();
                try {
                    await controller.deleteDoneTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('putDoneTodo', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'done1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.putDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('doneId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: {} };
                const res = makeRes();
                try {
                    await controller.putDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 done을 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' }, body: { name: 'updated' } };
                const res = makeRes();

                await controller.putDoneTodo(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { uuid: 'done1', name: 'updated' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.putDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('deleteDoneTodo', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'done1' } };
                const res = makeRes();
                try {
                    await controller.deleteDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('doneId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null } };
                const res = makeRes();
                try {
                    await controller.deleteDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' } };
                const res = makeRes();

                await controller.deleteDoneTodo(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' } };
                const res = makeRes();
                try {
                    await controller.deleteDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('revertDoneTodo', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'done1' }, apiVersion: 'v1' };
                const res = makeRes();
                try {
                    await controller.revertDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('doneEventId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, apiVersion: 'v1' };
                const res = makeRes();
                try {
                    await controller.revertDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공 - v1', () => {

            it('revertDoneTodo 결과를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' }, apiVersion: 'v1' };
                const res = makeRes();

                await controller.revertDoneTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'reverted', name: 'reverted todo' });
            });
        });

        describe('service 성공 - v2', () => {

            it('revertDoneTodoV2 결과를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' }, apiVersion: 'v2' };
                const res = makeRes();

                await controller.revertDoneTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { todo: { uuid: 'reverted' }, detail: null });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'done1' }, apiVersion: 'v1' };
                const res = makeRes();
                try {
                    await controller.revertDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('cancelDoneTodo', () => {

        // 주의: controller에서 origin.uuid 접근이 입력 검증보다 먼저 실행됨.
        // userId 누락 테스트 시에도 origin 객체를 반드시 제공해야 함.

        const validOrigin = { uuid: 'todo1', name: 'todo name', event_time: { time_type: 'at', timestamp: 100 } };

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: { origin: validOrigin, done_id: 'done1' } };
                const res = makeRes();
                try {
                    await controller.cancelDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('origin.uuid 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, body: { origin: { ...validOrigin, uuid: null }, done_id: 'done1' } };
                const res = makeRes();
                try {
                    await controller.cancelDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('취소 결과를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { origin: validOrigin, done_id: 'done1' } };
                const res = makeRes();

                await controller.cancelDoneTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { reverted: { uuid: 'origin' }, done_id: 'done1' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: { origin: validOrigin, done_id: 'done1' } };
                const res = makeRes();
                try {
                    await controller.cancelDoneTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
