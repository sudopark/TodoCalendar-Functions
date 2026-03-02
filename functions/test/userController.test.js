
const assert = require('assert');
const UserController = require('../controllers/userController');
const Errors = require('../models/Errors');
const StubServices = require('./doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('UserController', () => {

    let stubService;
    let controller;

    const makeReq = ({ uid = 'uid', deviceId = 'device1', token = 'fcm-token', model = 'iPhone' } = {}) => ({
        auth: { uid },
        header: (name) => name === 'device_id' ? deviceId : null,
        body: { fcm_token: token, device_model: model }
    });

    beforeEach(() => {
        stubService = new StubServices.User();
        controller = new UserController(stubService);
    });


    describe('updateNotificationToken', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = makeReq({ uid: null });
                const res = makeRes();
                try {
                    await controller.updateNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('deviceId 없으면 BadRequest', async () => {
                const req = makeReq({ deviceId: null });
                const res = makeRes();
                try {
                    await controller.updateNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('fcm_token 없으면 BadRequest', async () => {
                const req = makeReq({ token: null });
                const res = makeRes();
                try {
                    await controller.updateNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = makeReq();
                const res = makeRes();

                await controller.updateNotificationToken(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = makeReq();
                const res = makeRes();
                try {
                    await controller.updateNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('removeNotificationToken', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = makeReq({ uid: null });
                const res = makeRes();
                try {
                    await controller.removeNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('deviceId 없으면 BadRequest', async () => {
                const req = makeReq({ deviceId: null });
                const res = makeRes();
                try {
                    await controller.removeNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = makeReq();
                const res = makeRes();

                await controller.removeNotificationToken(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = makeReq();
                const res = makeRes();
                try {
                    await controller.removeNotificationToken(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
