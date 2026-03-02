

const assert = require('assert');
const AccountController = require('../controllers/accountController');
const Errors = require('../models/Errors');
const StubServices = require('./doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('AccountController', () => {

    let stubService;
    let controller;

    const dummyAuth = {
        uid: 'some',
        email: 'some@email.com',
        firebase: { sign_in_provider: 'google' },
        auth_time: 100
    };

    beforeEach(() => {
        stubService = new StubServices.Account();
        controller = new AccountController(stubService);
    });


    describe('putAccountInfo', () => {

        describe('입력값 검증', () => {

            it('auth 없으면 BadRequest 에러', async () => {
                const req = { auth: null };
                const res = makeRes();

                try {
                    await controller.putAccountInfo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('service 결과를 201로 응답', async () => {
                const req = { auth: dummyAuth };
                const res = makeRes();

                await controller.putAccountInfo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uid: 'some', email: 'some@email.com' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: dummyAuth };
                const res = makeRes();

                try {
                    await controller.putAccountInfo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                    assert.equal(error.message, 'service failed');
                }
            });
        });
    });


    describe('deleteAccount', () => {

        describe('입력값 검증', () => {

            it('auth 없으면 BadRequest 에러', async () => {
                const req = { auth: null };
                const res = makeRes();

                try {
                    await controller.deleteAccount(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('service 결과를 200으로 응답', async () => {
                const req = { auth: dummyAuth };
                const res = makeRes();

                await controller.deleteAccount(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: dummyAuth };
                const res = makeRes();

                try {
                    await controller.deleteAccount(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                    assert.equal(error.message, 'service failed');
                }
            });
        });
    });
});
