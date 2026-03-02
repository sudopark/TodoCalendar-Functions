
const assert = require('assert');
const DataSyncController = require('../../controllers/dataSyncController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('DataSyncController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.DataSync();
        controller = new DataSyncController(stubService);
    });


    describe('checkSync', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            query: { dataType: 'Todo', timestamp: '100' }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: { dataType: 'Todo' } };
                const res = makeRes();
                try {
                    await controller.checkSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('dataType 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: {} };
                const res = makeRes();
                try {
                    await controller.checkSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('지원하지 않는 dataType이면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Invalid' } };
                const res = makeRes();
                try {
                    await controller.checkSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('timestamp가 숫자 형식이 아니면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Todo', timestamp: 'abc' } };
                const res = makeRes();
                try {
                    await controller.checkSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('결과를 JSON 문자열로 200 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.checkSync(req, res);

                assert.equal(res.statusCode, 200);
                assert.equal(res.body, JSON.stringify({ result: 'noNeedToSync' }));
            });

            it('timestamp 없어도 성공', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'EventTag' } };
                const res = makeRes();

                await controller.checkSync(req, res);

                assert.equal(res.statusCode, 200);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.checkSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('startSync', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            query: { dataType: 'Schedule', timestamp: '100', size: '20' }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: { dataType: 'Todo', size: '10' } };
                const res = makeRes();
                try {
                    await controller.startSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('dataType 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { size: '10' } };
                const res = makeRes();
                try {
                    await controller.startSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('지원하지 않는 dataType이면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Unknown', size: '10' } };
                const res = makeRes();
                try {
                    await controller.startSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('timestamp가 숫자 형식이 아니면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Todo', timestamp: 'abc', size: '10' } };
                const res = makeRes();
                try {
                    await controller.startSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('size 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Todo' } };
                const res = makeRes();
                try {
                    await controller.startSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('결과를 JSON 문자열로 200 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.startSync(req, res);

                assert.equal(res.statusCode, 200);
                assert.equal(res.body, JSON.stringify({ created: [], updated: [], deleted: [] }));
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.startSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('continuteSync', () => {

        // 주의: 메서드명이 'continuteSync'로 오타 있음 (continueSync 아님)
        const validReq = () => ({
            auth: { uid: 'uid' },
            query: { dataType: 'Todo', cursor: 'cursor-abc', size: '20' }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: { dataType: 'Todo', cursor: 'c1', size: '10' } };
                const res = makeRes();
                try {
                    await controller.continuteSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('dataType 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { cursor: 'c1', size: '10' } };
                const res = makeRes();
                try {
                    await controller.continuteSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('cursor 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Todo', size: '10' } };
                const res = makeRes();
                try {
                    await controller.continuteSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('지원하지 않는 dataType이면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { dataType: 'Unknown', cursor: 'c1', size: '10' } };
                const res = makeRes();
                try {
                    await controller.continuteSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('결과를 JSON 문자열로 200 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.continuteSync(req, res);

                assert.equal(res.statusCode, 200);
                assert.equal(res.body, JSON.stringify({ created: [], updated: [], deleted: [] }));
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.continuteSync(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
