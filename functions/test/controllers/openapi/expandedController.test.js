
const assert = require('assert');
const TodoOpenController = require('../../../controllers/openapi/todoOpenController');
const ScheduleOpenController = require('../../../controllers/openapi/scheduleOpenController');
const Errors = require('../../../models/Errors');

const YEAR = 365 * 86400;

function makeRes() {
    return {
        statusCode: null, body: null,
        status(c) { this.statusCode = c; return this; },
        send(d) { this.body = d; return this; }
    };
}

function stubTodoService() {
    return {
        lastArgs: null,
        async findExpandedTodos(userId, lower, upper, limit, cursor) {
            this.lastArgs = { userId, lower, upper, limit, cursor };
            return { events: {}, occurrences: [], next_cursor: null };
        }
    };
}

describe('getExpandedTodos', () => {

    it('정상: 200 + service 위임, limit default 100', async () => {
        const svc = stubTodoService();
        const ctrl = new TodoOpenController(svc);
        const req = { openUserId: 'u', query: { lower: '0', upper: String(10 * 86400) } };
        const res = makeRes();
        await ctrl.getExpandedTodos(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(svc.lastArgs.limit, 100);
    });

    it('lower/upper 누락 → BadRequest', async () => {
        const ctrl = new TodoOpenController(stubTodoService());
        await assert.rejects(ctrl.getExpandedTodos({ openUserId: 'u', query: { lower: '0' } }, makeRes()), Errors.BadRequest);
    });

    it('window > 1년 → BadRequest', async () => {
        const ctrl = new TodoOpenController(stubTodoService());
        const req = { openUserId: 'u', query: { lower: '0', upper: String(YEAR + 86400) } };
        await assert.rejects(ctrl.getExpandedTodos(req, makeRes()), Errors.BadRequest);
    });

    it('limit > 500 → 500으로 clamp', async () => {
        const svc = stubTodoService();
        const ctrl = new TodoOpenController(svc);
        const req = { openUserId: 'u', query: { lower: '0', upper: String(86400), limit: '9999' } };
        await ctrl.getExpandedTodos(req, makeRes());
        assert.equal(svc.lastArgs.limit, 500);
    });

    it('cursor passthrough', async () => {
        const svc = stubTodoService();
        const ctrl = new TodoOpenController(svc);
        const req = { openUserId: 'u', query: { lower: '0', upper: String(86400), cursor: 'abc' } };
        await ctrl.getExpandedTodos(req, makeRes());
        assert.equal(svc.lastArgs.cursor, 'abc');
    });
});

describe('getExpandedEvents', () => {

    it('정상 위임 200', async () => {
        const svc = { async findExpandedEvents() { return { events: {}, occurrences: [], next_cursor: null }; } };
        const ctrl = new ScheduleOpenController(svc);
        const res = makeRes();
        await ctrl.getExpandedEvents({ openUserId: 'u', query: { lower: '0', upper: String(86400) } }, res);
        assert.equal(res.statusCode, 200);
    });
});
