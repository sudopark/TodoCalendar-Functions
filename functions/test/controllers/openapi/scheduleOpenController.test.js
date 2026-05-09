
const assert = require('assert');
const ScheduleOpenController = require('../../../controllers/openapi/scheduleOpenController');
const Errors = require('../../../models/Errors');
const StubServices = require('../../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('ScheduleOpenController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.ScheduleEvent();
        controller = new ScheduleOpenController(stubService);
    });


    describe('getEvent', () => {

        it('id 없으면 BadRequest', async () => {
            const req = { params: {} };
            const res = makeRes();
            await assert.rejects(controller.getEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { params: { id: 'evt1' } };
            const res = makeRes();
            await controller.getEvent(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'evt1' } };
            const res = makeRes();
            await assert.rejects(controller.getEvent(req, res), Errors.Application);
        });
    });


    describe('getEvents', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, query: { lower: '1', upper: '2' } };
            const res = makeRes();
            await assert.rejects(controller.getEvents(req, res), Errors.BadRequest);
        });

        it('lower 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', query: { upper: '2' } };
            const res = makeRes();
            await assert.rejects(controller.getEvents(req, res), Errors.BadRequest);
        });

        it('upper 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', query: { lower: '1' } };
            const res = makeRes();
            await assert.rejects(controller.getEvents(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { openUserId: 'uid', query: { lower: '1', upper: '2' } };
            const res = makeRes();
            await controller.getEvents(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', query: { lower: '1', upper: '2' } };
            const res = makeRes();
            await assert.rejects(controller.getEvents(req, res), Errors.Application);
        });
    });


    describe('makeEvent', () => {

        const validReq = () => ({
            openUserId: 'uid',
            body: { name: 'evt', event_time: { time_type: 'at', timestamp: 100 } }
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, body: { name: 'e', event_time: {} } };
            const res = makeRes();
            await assert.rejects(controller.makeEvent(req, res), Errors.BadRequest);
        });

        it('name 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: { event_time: {} } };
            const res = makeRes();
            await assert.rejects(controller.makeEvent(req, res), Errors.BadRequest);
        });

        it('event_time 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: { name: 'e' } };
            const res = makeRes();
            await assert.rejects(controller.makeEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const res = makeRes();
            await controller.makeEvent(validReq(), res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const res = makeRes();
            await assert.rejects(controller.makeEvent(validReq(), res), Errors.Application);
        });
    });


    describe('putEvent', () => {

        const validReq = () => ({
            openUserId: 'uid',
            params: { id: 'evt1' },
            body: { name: 'evt', event_time: {} }
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'evt1' }, body: { name: 'e', event_time: {} } };
            const res = makeRes();
            await assert.rejects(controller.putEvent(req, res), Errors.BadRequest);
        });

        it('eventId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: { name: 'e', event_time: {} } };
            const res = makeRes();
            await assert.rejects(controller.putEvent(req, res), Errors.BadRequest);
        });

        it('name 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: { id: 'evt1' }, body: { event_time: {} } };
            const res = makeRes();
            await assert.rejects(controller.putEvent(req, res), Errors.BadRequest);
        });

        it('event_time 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: { id: 'evt1' }, body: { name: 'e' } };
            const res = makeRes();
            await assert.rejects(controller.putEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const res = makeRes();
            await controller.putEvent(validReq(), res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const res = makeRes();
            await assert.rejects(controller.putEvent(validReq(), res), Errors.Application);
        });
    });


    describe('patchEvent', () => {

        it('eventId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: {} };
            const res = makeRes();
            await assert.rejects(controller.patchEvent(req, res), Errors.BadRequest);
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'evt1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.patchEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', params: { id: 'evt1' }, body: { name: 'patched' } };
            const res = makeRes();
            await controller.patchEvent(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'evt1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.patchEvent(req, res), Errors.Application);
        });
    });


    describe('removeEvent', () => {

        it('eventId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {} };
            const res = makeRes();
            await assert.rejects(controller.removeEvent(req, res), Errors.BadRequest);
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'evt1' } };
            const res = makeRes();
            await assert.rejects(controller.removeEvent(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', params: { id: 'evt1' } };
            const res = makeRes();
            await controller.removeEvent(req, res);
            assert.equal(res.statusCode, 201);
            assert.deepEqual(res.body, { status: 'ok' });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'evt1' } };
            const res = makeRes();
            await assert.rejects(controller.removeEvent(req, res), Errors.Application);
        });
    });


    describe('makeNewEventWithExcludeFromRepeating', () => {

        const validReq = () => ({
            openUserId: 'uid',
            params: { id: 'evt1' },
            body: { new: { name: 'new', event_time: {} }, exclude_repeatings: 100 }
        });

        it('userId 없으면 BadRequest', async () => {
            const r = validReq(); r.openUserId = null;
            const res = makeRes();
            await assert.rejects(controller.makeNewEventWithExcludeFromRepeating(r, res), Errors.BadRequest);
        });

        it('eventId 없으면 BadRequest', async () => {
            const r = validReq(); r.params = {};
            const res = makeRes();
            await assert.rejects(controller.makeNewEventWithExcludeFromRepeating(r, res), Errors.BadRequest);
        });

        it('new payload name 없으면 BadRequest', async () => {
            const r = validReq(); r.body.new = { event_time: {} };
            const res = makeRes();
            await assert.rejects(controller.makeNewEventWithExcludeFromRepeating(r, res), Errors.BadRequest);
        });

        it('exclude_repeatings 없으면 BadRequest', async () => {
            const r = validReq(); r.body.exclude_repeatings = null;
            const res = makeRes();
            await assert.rejects(controller.makeNewEventWithExcludeFromRepeating(r, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const res = makeRes();
            await controller.makeNewEventWithExcludeFromRepeating(validReq(), res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const res = makeRes();
            await assert.rejects(controller.makeNewEventWithExcludeFromRepeating(validReq(), res), Errors.Application);
        });
    });


    describe('branchRepeatingEvent', () => {

        const validReq = () => ({
            openUserId: 'uid',
            params: { id: 'evt1' },
            body: { new: { name: 'new', event_time: {} }, end_time: 200 }
        });

        it('userId 없으면 BadRequest', async () => {
            const r = validReq(); r.openUserId = null;
            const res = makeRes();
            await assert.rejects(controller.branchRepeatingEvent(r, res), Errors.BadRequest);
        });

        it('eventId 없으면 BadRequest', async () => {
            const r = validReq(); r.params = {};
            const res = makeRes();
            await assert.rejects(controller.branchRepeatingEvent(r, res), Errors.BadRequest);
        });

        it('end_time 없으면 BadRequest', async () => {
            const r = validReq(); r.body.end_time = null;
            const res = makeRes();
            await assert.rejects(controller.branchRepeatingEvent(r, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const res = makeRes();
            await controller.branchRepeatingEvent(validReq(), res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const res = makeRes();
            await assert.rejects(controller.branchRepeatingEvent(validReq(), res), Errors.Application);
        });
    });


    describe('excludeRepeatingTime', () => {

        it('eventId 없으면 BadRequest', async () => {
            const req = { params: {}, body: { exclude_repeatings: 100 } };
            const res = makeRes();
            await assert.rejects(controller.excludeRepeatingTime(req, res), Errors.BadRequest);
        });

        it('exclude_repeatings 없으면 BadRequest', async () => {
            const req = { params: { id: 'evt1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.excludeRepeatingTime(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { params: { id: 'evt1' }, body: { exclude_repeatings: 100 } };
            const res = makeRes();
            await controller.excludeRepeatingTime(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'evt1' }, body: { exclude_repeatings: 100 } };
            const res = makeRes();
            await assert.rejects(controller.excludeRepeatingTime(req, res), Errors.Application);
        });
    });
});
