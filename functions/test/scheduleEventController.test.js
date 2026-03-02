
const assert = require('assert');
const ScheduleEventController = require('../controllers/scheduleEventController');
const Errors = require('../models/Errors');
const StubServices = require('./doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('ScheduleEventController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.ScheduleEvent();
        controller = new ScheduleEventController(stubService);
    });


    describe('getEvent', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { params: { id: null } };
                const res = makeRes();
                try {
                    await controller.getEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('이벤트를 200으로 응답', async () => {
                const req = { params: { id: 'evt1' } };
                const res = makeRes();

                await controller.getEvent(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { uuid: 'evt1', name: 'some event', event_time: { time_type: 'at', timestamp: 100 } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'evt1' } };
                const res = makeRes();
                try {
                    await controller.getEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getEvents', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: { lower: '100', upper: '200' } };
                const res = makeRes();
                try {
                    await controller.getEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('lower 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { upper: '200' } };
                const res = makeRes();
                try {
                    await controller.getEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('upper 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: { lower: '100' } };
                const res = makeRes();
                try {
                    await controller.getEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('이벤트 목록을 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, query: { lower: '100', upper: '200' } };
                const res = makeRes();

                await controller.getEvents(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'evt1' }, { uuid: 'evt2' }]);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, query: { lower: '100', upper: '200' } };
                const res = makeRes();
                try {
                    await controller.getEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('makeEvent', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            body: { name: 'some event', event_time: { time_type: 'at', timestamp: 100 } }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: { name: 'evt', event_time: {} } };
                const res = makeRes();
                try {
                    await controller.makeEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, body: { event_time: {} } };
                const res = makeRes();
                try {
                    await controller.makeEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('event_time 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, body: { name: 'evt' } };
                const res = makeRes();
                try {
                    await controller.makeEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('생성된 이벤트를 201로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.makeEvent(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'new-evt', name: 'new event' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.makeEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('putEvent', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            params: { id: 'evt1' },
            body: { name: 'updated', event_time: { time_type: 'at', timestamp: 200 } }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'evt1' }, body: { name: 'evt', event_time: {} } };
                const res = makeRes();
                try {
                    await controller.putEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('eventId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { name: 'evt', event_time: {} } };
                const res = makeRes();
                try {
                    await controller.putEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { event_time: {} } };
                const res = makeRes();
                try {
                    await controller.putEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('event_time 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { name: 'evt' } };
                const res = makeRes();
                try {
                    await controller.putEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 이벤트를 201로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.putEvent(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'evt1', name: 'some event', event_time: { time_type: 'at', timestamp: 100 } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.putEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('patchEvent', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: {} };
                const res = makeRes();
                try {
                    await controller.patchEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'evt1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.patchEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 이벤트를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { name: 'patched' } };
                const res = makeRes();

                await controller.patchEvent(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'evt1', name: 'some event', event_time: { time_type: 'at', timestamp: 100 } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.patchEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('makeNewEventWithExcludeFromRepeating', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            params: { id: 'evt1' },
            body: {
                new: { name: 'new event', event_time: { time_type: 'at', timestamp: 200 } },
                exclude_repeatings: 100
            }
        });

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { new: { name: 'n', event_time: {} }, exclude_repeatings: 100 } };
                const res = makeRes();
                try {
                    await controller.makeNewEventWithExcludeFromRepeating(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'evt1' }, body: { new: { name: 'n', event_time: {} }, exclude_repeatings: 100 } };
                const res = makeRes();
                try {
                    await controller.makeNewEventWithExcludeFromRepeating(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('new.name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { new: { event_time: {} }, exclude_repeatings: 100 } };
                const res = makeRes();
                try {
                    await controller.makeNewEventWithExcludeFromRepeating(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('exclude_repeatings 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { new: { name: 'n', event_time: {} } } };
                const res = makeRes();
                try {
                    await controller.makeNewEventWithExcludeFromRepeating(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('결과를 201로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.makeNewEventWithExcludeFromRepeating(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { updated_origin: { uuid: 'evt1' }, new_schedule: { uuid: 'new-evt' } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.makeNewEventWithExcludeFromRepeating(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('branchRepeatingEvent', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            params: { id: 'evt1' },
            body: {
                end_time: 100,
                new: { name: 'branched', event_time: { time_type: 'at', timestamp: 200 } }
            }
        });

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { end_time: 100, new: { name: 'n', event_time: {} } } };
                const res = makeRes();
                try {
                    await controller.branchRepeatingEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'evt1' }, body: { end_time: 100, new: { name: 'n', event_time: {} } } };
                const res = makeRes();
                try {
                    await controller.branchRepeatingEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('end_time 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { new: { name: 'n', event_time: {} } } };
                const res = makeRes();
                try {
                    await controller.branchRepeatingEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('new.name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' }, body: { end_time: 100, new: { event_time: {} } } };
                const res = makeRes();
                try {
                    await controller.branchRepeatingEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('결과를 201로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.branchRepeatingEvent(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { new: { uuid: 'new-evt' }, origin: { uuid: 'evt1' } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.branchRepeatingEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('excludeRepeatingTime', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { params: { id: null }, body: { exclude_repeatings: 100 } };
                const res = makeRes();
                try {
                    await controller.excludeRepeatingTime(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('exclude_repeatings 없으면 BadRequest', async () => {
                const req = { params: { id: 'evt1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.excludeRepeatingTime(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('결과를 200으로 응답', async () => {
                const req = { params: { id: 'evt1' }, body: { exclude_repeatings: 100 } };
                const res = makeRes();

                await controller.excludeRepeatingTime(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { uuid: 'evt1', exclude_repeatings: [100] });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'evt1' }, body: { exclude_repeatings: 100 } };
                const res = makeRes();
                try {
                    await controller.excludeRepeatingTime(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('removeEvent', () => {

        describe('입력값 검증', () => {

            it('eventId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null } };
                const res = makeRes();
                try {
                    await controller.removeEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('201로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' } };
                const res = makeRes();

                await controller.removeEvent(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'evt1' } };
                const res = makeRes();
                try {
                    await controller.removeEvent(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
