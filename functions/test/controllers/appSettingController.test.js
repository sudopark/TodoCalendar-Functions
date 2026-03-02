
const assert = require('assert');
const AppSettingController = require('../../controllers/appSettingController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('AppSettingController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.AppSetting();
        controller = new AppSettingController(stubService);
    });


    describe('getUserDefaultEventTagColors', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest 에러', async () => {
                const req = { auth: { uid: null } };
                const res = makeRes();

                try {
                    await controller.getUserDefaultEventTagColors(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('색상 결과를 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();

                await controller.getUserDefaultEventTagColors(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { holiday: '#D6236A', default: '#088CDA' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();

                try {
                    await controller.getUserDefaultEventTagColors(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('patchUserDefaultEventTagColors', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest 에러', async () => {
                const req = { auth: { uid: null }, body: { holiday: '#FF0000' } };
                const res = makeRes();

                try {
                    await controller.patchUserDefaultEventTagColors(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('holiday와 default 모두 없으면 BadRequest 에러', async () => {
                const req = { auth: { uid: 'uid' }, body: {} };
                const res = makeRes();

                try {
                    await controller.patchUserDefaultEventTagColors(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('holiday만 있어도 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { holiday: '#FF0000' } };
                const res = makeRes();

                await controller.patchUserDefaultEventTagColors(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { holiday: '#D6236A', default: '#088CDA' });
            });

            it('default만 있어도 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { default: '#0000FF' } };
                const res = makeRes();

                await controller.patchUserDefaultEventTagColors(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { holiday: '#D6236A', default: '#088CDA' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: { holiday: '#FF0000' } };
                const res = makeRes();

                try {
                    await controller.patchUserDefaultEventTagColors(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
