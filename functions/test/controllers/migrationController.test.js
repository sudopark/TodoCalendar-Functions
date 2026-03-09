
const assert = require('assert');
const MigrationController = require('../../controllers/migrationController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('MigrationController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.Migration();
        controller = new MigrationController(stubService);
    });


    describe('postMigrationTags', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: { tag1: { name: 'tag' } } };
                const res = makeRes();
                try {
                    await controller.postMigrationTags(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { tag1: { name: 'tag' } } };
                const res = makeRes();

                await controller.postMigrationTags(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: { tag1: { name: 'tag' } } };
                const res = makeRes();
                try {
                    await controller.postMigrationTags(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('postMigrationTodos', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { todo1: { name: 'todo' } } };
                const res = makeRes();

                await controller.postMigrationTodos(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('postMigrationSchedules', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationSchedules(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { evt1: { name: 'schedule' } } };
                const res = makeRes();

                await controller.postMigrationSchedules(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationSchedules(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('postMigrationEventDetails', () => {

        // userId 검증 없음

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { body: { det1: { memo: 'note' } } };
                const res = makeRes();

                await controller.postMigrationEventDetails(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationEventDetails(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('postMigrationDoneTodoEvents', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationDoneTodoEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { done1: { name: 'done' } } };
                const res = makeRes();

                await controller.postMigrationDoneTodoEvents(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: {} };
                const res = makeRes();
                try {
                    await controller.postMigrationDoneTodoEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('postDoneTodoDetails', () => {

        // userId 검증 없음

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { body: { det1: { memo: 'note' } } };
                const res = makeRes();

                await controller.postDoneTodoDetails(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { body: {} };
                const res = makeRes();
                try {
                    await controller.postDoneTodoDetails(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
