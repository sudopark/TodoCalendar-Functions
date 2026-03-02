
const assert = require('assert');
const TodooController = require('../../controllers/todoController');
const Errors = require('../../models/Errors');
const StubServices = require('../doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('TodooController', () => {

    let stubService;
    let controller;

    beforeEach(() => {
        stubService = new StubServices.TodoEvent();
        controller = new TodooController(stubService);
    });


    describe('getTodo', () => {

        describe('입력값 검증', () => {

            it('todoId 없으면 BadRequest', async () => {
                const req = { params: { id: null } };
                const res = makeRes();
                try {
                    await controller.getTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('todo를 200으로 응답', async () => {
                const req = { params: { id: 'todo1' } };
                const res = makeRes();

                await controller.getTodo(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { uuid: 'todo1', name: 'some todo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { params: { id: 'todo1' } };
                const res = makeRes();
                try {
                    await controller.getTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getTodos', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: {} };
                const res = makeRes();
                try {
                    await controller.getTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('lower, upper 있으면 기간 조회 결과를 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, query: { lower: '100', upper: '200' } };
                const res = makeRes();

                await controller.getTodos(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'todo1' }, { uuid: 'todo2' }]);
            });

            it('lower, upper 없으면 current todos를 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, query: {} };
                const res = makeRes();

                await controller.getTodos(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'todo1' }, { uuid: 'todo2' }]);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, query: {} };
                const res = makeRes();
                try {
                    await controller.getTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getUncompletedTodos', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, query: { refTime: '100' } };
                const res = makeRes();
                try {
                    await controller.getUncompletedTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('refTime 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, query: {} };
                const res = makeRes();
                try {
                    await controller.getUncompletedTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('미완료 todo 목록을 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, query: { refTime: '100' } };
                const res = makeRes();

                await controller.getUncompletedTodos(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'todo1' }]);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, query: { refTime: '100' } };
                const res = makeRes();
                try {
                    await controller.getUncompletedTodos(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('makeTodo', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: { name: 'todo' } };
                const res = makeRes();
                try {
                    await controller.makeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, body: {} };
                const res = makeRes();
                try {
                    await controller.makeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('생성된 todo를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { name: 'new todo' } };
                const res = makeRes();

                await controller.makeTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'todo1', name: 'some todo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: { name: 'todo' } };
                const res = makeRes();
                try {
                    await controller.makeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('putTodo', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'todo1' }, body: { name: 'updated' } };
                const res = makeRes();
                try {
                    await controller.putTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('todoId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { name: 'updated' } };
                const res = makeRes();
                try {
                    await controller.putTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.putTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 todo를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: { name: 'updated' } };
                const res = makeRes();

                await controller.putTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'todo1', name: 'some todo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: { name: 'updated' } };
                const res = makeRes();
                try {
                    await controller.putTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('patchTodo', () => {

        describe('입력값 검증', () => {

            it('todoId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: {} };
                const res = makeRes();
                try {
                    await controller.patchTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'todo1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.patchTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 todo를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: { name: 'patched' } };
                const res = makeRes();

                await controller.patchTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'todo1', name: 'some todo' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.patchTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('completeTodo', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            params: { id: 'todo1' },
            body: { origin: { uuid: 'todo1', name: 'some todo' }, next_event_time: null }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'todo1' }, body: { origin: { uuid: 'todo1' } } };
                const res = makeRes();
                try {
                    await controller.completeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('originId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { origin: { uuid: 'todo1' } } };
                const res = makeRes();
                try {
                    await controller.completeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('origin 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.completeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('완료 결과를 201로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.completeTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { done: { uuid: 'done1' } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.completeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('replaceRepeatingTodo', () => {

        const validReq = () => ({
            auth: { uid: 'uid' },
            params: { id: 'todo1' },
            body: { new: { name: 'new todo' }, origin_next_event_time: 100 }
        });

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'todo1' }, body: { new: { name: 'n' } } };
                const res = makeRes();
                try {
                    await controller.replaceRepeatingTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('originId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { new: { name: 'n' } } };
                const res = makeRes();
                try {
                    await controller.replaceRepeatingTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('new payload 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.replaceRepeatingTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('교체 결과를 201로 응답', async () => {
                const req = validReq();
                const res = makeRes();

                await controller.replaceRepeatingTodo(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { new_todo: { uuid: 'new' } });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = validReq();
                const res = makeRes();
                try {
                    await controller.replaceRepeatingTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('removeTodo', () => {

        describe('입력값 검증', () => {

            it('todoId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null } };
                const res = makeRes();
                try {
                    await controller.removeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'todo1' } };
                const res = makeRes();
                try {
                    await controller.removeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' } };
                const res = makeRes();

                await controller.removeTodo(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'todo1' } };
                const res = makeRes();
                try {
                    await controller.removeTodo(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
