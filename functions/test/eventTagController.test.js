
const assert = require('assert');
const EventTagController = require('../controllers/eventTagController');
const Errors = require('../models/Errors');
const StubServices = require('./doubles/stubServices');
const makeRes = StubServices.makeRes;


describe('EventTagController', () => {

    let stubTagService;
    let stubTodoService;
    let stubScheduleService;
    let stubDetailService;
    let controller;

    beforeEach(() => {
        stubTagService = new StubServices.EventTag();
        stubTodoService = new StubServices.TodoEvent();
        stubScheduleService = new StubServices.ScheduleEvent();
        stubDetailService = new StubServices.EventDetailData();
        controller = new EventTagController(stubTagService, stubTodoService, stubScheduleService, stubDetailService);
    });


    describe('postEventTag', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, body: { name: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.postEventTag(req, res);
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
                    await controller.postEventTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('생성된 태그를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, body: { name: 'some tag', color_hex: '#FFFFFF' } };
                const res = makeRes();

                await controller.postEventTag(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'tag1', name: 'some tag', color_hex: '#FFFFFF' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubTagService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, body: { name: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.postEventTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('putEventTag', () => {

        describe('입력값 검증', () => {

            it('tagId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, body: { name: 'updated' } };
                const res = makeRes();
                try {
                    await controller.putEventTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('name 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' }, body: {} };
                const res = makeRes();
                try {
                    await controller.putEventTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'tag1' }, body: { name: 'updated' } };
                const res = makeRes();
                try {
                    await controller.putEventTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('업데이트된 태그를 201로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' }, body: { name: 'some tag', color_hex: '#FFFFFF' } };
                const res = makeRes();

                await controller.putEventTag(req, res);

                assert.equal(res.statusCode, 201);
                assert.deepEqual(res.body, { uuid: 'tag1', name: 'some tag', color_hex: '#FFFFFF' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubTagService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' }, body: { name: 'updated' } };
                const res = makeRes();
                try {
                    await controller.putEventTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('deleteTag', () => {

        describe('입력값 검증', () => {

            it('tagId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null } };
                const res = makeRes();
                try {
                    await controller.deleteTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.deleteTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('200으로 ok 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' } };
                const res = makeRes();

                await controller.deleteTag(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { status: 'ok' });
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubTagService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.deleteTag(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('deleteTagAndEvents', () => {

        describe('입력값 검증', () => {

            it('tagId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null } };
                const res = makeRes();
                try {
                    await controller.deleteTagAndEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.deleteTagAndEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('삭제된 todo/schedule id 목록을 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' } };
                const res = makeRes();

                await controller.deleteTagAndEvents(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { todos: ['todo1', 'todo2'], schedules: ['evt1', 'evt2'] });
            });
        });

        describe('service 실패', () => {

            it('tagService 실패시 Application 에러', async () => {
                stubTagService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.deleteTagAndEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });

            it('todoService 실패시 Application 에러', async () => {
                stubTodoService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' } };
                const res = makeRes();
                try {
                    await controller.deleteTagAndEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('deleteTagWithEvents', () => {

        describe('입력값 검증', () => {

            it('tagId 없으면 BadRequest', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: null }, query: {} };
                const res = makeRes();
                try {
                    await controller.deleteTagWithEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null }, params: { id: 'tag1' }, query: {} };
                const res = makeRes();
                try {
                    await controller.deleteTagWithEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('todos와 schedules id 제공시 200으로 응답', async () => {
                const req = {
                    auth: { uid: 'uid' }, params: { id: 'tag1' },
                    query: { todos: ['todo1', 'todo2'], schedules: ['evt1'] }
                };
                const res = makeRes();

                await controller.deleteTagWithEvents(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { todos: ['todo1', 'todo2'], schedules: ['evt1'] });
            });

            it('todos와 schedules 없이도 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' }, query: {} };
                const res = makeRes();

                await controller.deleteTagWithEvents(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, { todos: [], schedules: [] });
            });
        });

        describe('service 실패', () => {

            it('tagService 실패시 Application 에러', async () => {
                stubTagService.shouldFail = true;
                const req = { auth: { uid: 'uid' }, params: { id: 'tag1' }, query: {} };
                const res = makeRes();
                try {
                    await controller.deleteTagWithEvents(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getAllTags', () => {

        describe('입력값 검증', () => {

            it('userId 없으면 BadRequest', async () => {
                const req = { auth: { uid: null } };
                const res = makeRes();
                try {
                    await controller.getAllTags(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('태그 목록을 200으로 응답', async () => {
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();

                await controller.getAllTags(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'tag1', name: 'some tag' }]);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubTagService.shouldFail = true;
                const req = { auth: { uid: 'uid' } };
                const res = makeRes();
                try {
                    await controller.getAllTags(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });


    describe('getTags', () => {

        describe('입력값 검증', () => {

            it('ids 없으면 BadRequest', async () => {
                const req = { query: {} };
                const res = makeRes();
                try {
                    await controller.getTags(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.BadRequest);
                    assert.equal(error.status, 400);
                }
            });
        });

        describe('service 성공', () => {

            it('태그 목록을 200으로 응답', async () => {
                const req = { query: { ids: ['tag1'] } };
                const res = makeRes();

                await controller.getTags(req, res);

                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, [{ uuid: 'tag1', name: 'some tag' }]);
            });
        });

        describe('service 실패', () => {

            it('Application 에러로 래핑해서 throw', async () => {
                stubTagService.shouldFail = true;
                const req = { query: { ids: ['tag1'] } };
                const res = makeRes();
                try {
                    await controller.getTags(req, res);
                    assert.fail('에러가 발생해야 합니다');
                } catch (error) {
                    assert.ok(error instanceof Errors.Application);
                    assert.equal(error.status, 500);
                }
            });
        });
    });
});
