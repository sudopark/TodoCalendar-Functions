
const assert = require('assert');
const TodoOpenController = require('../../../controllers/openapi/todoOpenController');
const Errors = require('../../../models/Errors');
const StubServices = require('../../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('TodoOpenController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.TodoEvent();
        controller = new TodoOpenController(stubService);
    });


    describe('getUncompletedTodos', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, query: { refTime: '100' } };
            const res = makeRes();
            await assert.rejects(controller.getUncompletedTodos(req, res), Errors.BadRequest);
        });

        it('refTime 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', query: {} };
            const res = makeRes();
            await assert.rejects(controller.getUncompletedTodos(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { openUserId: 'uid', query: { refTime: '100' } };
            const res = makeRes();
            await controller.getUncompletedTodos(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, [{ uuid: 'todo1' }]);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', query: { refTime: '100' } };
            const res = makeRes();
            await assert.rejects(controller.getUncompletedTodos(req, res), Errors.Application);
        });
    });


    describe('getTodo', () => {

        it('id 없으면 BadRequest', async () => {
            const req = { params: {} };
            const res = makeRes();
            await assert.rejects(controller.getTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 200', async () => {
            const req = { params: { id: 'todo1' } };
            const res = makeRes();
            await controller.getTodo(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { uuid: 'todo1', name: 'some todo' });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { params: { id: 'todo1' } };
            const res = makeRes();
            await assert.rejects(controller.getTodo(req, res), Errors.Application);
        });
    });


    describe('getTodos', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, query: {} };
            const res = makeRes();
            await assert.rejects(controller.getTodos(req, res), Errors.BadRequest);
        });

        it('lower/upper 있으면 기간 조회 → 200', async () => {
            const req = { openUserId: 'uid', query: { lower: '100', upper: '200' } };
            const res = makeRes();
            await controller.getTodos(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, [{ uuid: 'todo1' }, { uuid: 'todo2' }]);
        });

        it('lower/upper 없으면 current → 200', async () => {
            const req = { openUserId: 'uid', query: {} };
            const res = makeRes();
            await controller.getTodos(req, res);
            assert.equal(res.statusCode, 200);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', query: {} };
            const res = makeRes();
            await assert.rejects(controller.getTodos(req, res), Errors.Application);
        });
    });


    describe('makeTodo', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, body: { name: 'todo' } };
            const res = makeRes();
            await assert.rejects(controller.makeTodo(req, res), Errors.BadRequest);
        });

        it('name 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', body: {} };
            const res = makeRes();
            await assert.rejects(controller.makeTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', body: { name: 'new todo' } };
            const res = makeRes();
            await controller.makeTodo(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', body: { name: 'todo' } };
            const res = makeRes();
            await assert.rejects(controller.makeTodo(req, res), Errors.Application);
        });
    });


    describe('putTodo', () => {

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'todo1' }, body: { name: 'updated' } };
            const res = makeRes();
            await assert.rejects(controller.putTodo(req, res), Errors.BadRequest);
        });

        it('todoId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: { name: 'updated' } };
            const res = makeRes();
            await assert.rejects(controller.putTodo(req, res), Errors.BadRequest);
        });

        it('name 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.putTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: { name: 'updated' } };
            const res = makeRes();
            await controller.putTodo(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: { name: 'updated' } };
            const res = makeRes();
            await assert.rejects(controller.putTodo(req, res), Errors.Application);
        });
    });


    describe('patchTodo', () => {

        it('todoId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: {} };
            const res = makeRes();
            await assert.rejects(controller.patchTodo(req, res), Errors.BadRequest);
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'todo1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.patchTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: { name: 'patched' } };
            const res = makeRes();
            await controller.patchTodo(req, res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.patchTodo(req, res), Errors.Application);
        });
    });


    describe('removeTodo', () => {

        it('todoId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {} };
            const res = makeRes();
            await assert.rejects(controller.removeTodo(req, res), Errors.BadRequest);
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'todo1' } };
            const res = makeRes();
            await assert.rejects(controller.removeTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 200 {status:ok}', async () => {
            const req = { openUserId: 'uid', params: { id: 'todo1' } };
            const res = makeRes();
            await controller.removeTodo(req, res);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { status: 'ok' });
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const req = { openUserId: 'uid', params: { id: 'todo1' } };
            const res = makeRes();
            await assert.rejects(controller.removeTodo(req, res), Errors.Application);
        });
    });


    describe('completeTodo', () => {

        const validReq = () => ({
            openUserId: 'uid',
            params: { id: 'todo1' },
            body: { origin: { uuid: 'todo1', name: 'some todo' }, next_event_time: null }
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'todo1' }, body: { origin: { uuid: 'todo1' } } };
            const res = makeRes();
            await assert.rejects(controller.completeTodo(req, res), Errors.BadRequest);
        });

        it('originId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: { origin: { uuid: 'todo1' } } };
            const res = makeRes();
            await assert.rejects(controller.completeTodo(req, res), Errors.BadRequest);
        });

        it('origin 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.completeTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const res = makeRes();
            await controller.completeTodo(validReq(), res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const res = makeRes();
            await assert.rejects(controller.completeTodo(validReq(), res), Errors.Application);
        });
    });


    describe('replaceRepeatingTodo', () => {

        const validReq = () => ({
            openUserId: 'uid',
            params: { id: 'todo1' },
            body: { new: { name: 'new todo' }, origin_next_event_time: 100 }
        });

        it('userId 없으면 BadRequest', async () => {
            const req = { openUserId: null, params: { id: 'todo1' }, body: { new: { name: 'n' } } };
            const res = makeRes();
            await assert.rejects(controller.replaceRepeatingTodo(req, res), Errors.BadRequest);
        });

        it('originId 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: {}, body: { new: { name: 'n' } } };
            const res = makeRes();
            await assert.rejects(controller.replaceRepeatingTodo(req, res), Errors.BadRequest);
        });

        it('new 없으면 BadRequest', async () => {
            const req = { openUserId: 'uid', params: { id: 'todo1' }, body: {} };
            const res = makeRes();
            await assert.rejects(controller.replaceRepeatingTodo(req, res), Errors.BadRequest);
        });

        it('정상 → 201', async () => {
            const res = makeRes();
            await controller.replaceRepeatingTodo(validReq(), res);
            assert.equal(res.statusCode, 201);
        });

        it('service 실패 → Application', async () => {
            stubService.shouldFail = true;
            const res = makeRes();
            await assert.rejects(controller.replaceRepeatingTodo(validReq(), res), Errors.Application);
        });
    });
});
