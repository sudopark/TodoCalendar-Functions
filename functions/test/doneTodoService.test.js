
const DoneTodoService = require('../services/doneTodoService');
const EventTimeRangeService = require('../services/eventTimeRangeService');
const TodoServie = require('../services/todoEventService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');
const SpyChangeLogRecordService = require('./doubles/spyChangeLogRecordService');
const EventDetailService = require('../services/eventDetailService');

describe("DoneTodoService", () => {

    let spyDoneRepository;
    let spyTodoRepository;
    let stubEventDetailRepository;
    let stubDoneTodoDetailRepository;
    let service;

    beforeEach(() => {
        const todoRepository = new StubRepos.Todo();
        const eventTimeRangeService = new EventTimeRangeService(
            new StubRepos.EventTime()
        )
        const doneTodoRepository = new StubRepos.DoneTodo();
        const changeLogRecordService = new SpyChangeLogRecordService()
        const todoService = new TodoServie( {todoRepository, eventTimeRangeService, doneTodoRepository, changeLogRecordService});
        spyDoneRepository = doneTodoRepository
        spyTodoRepository = todoRepository
        stubEventDetailRepository = new StubRepos.EventDetailData()
        stubDoneTodoDetailRepository = new StubRepos.EventDetailData()
        const detailService = new EventDetailService(
            stubEventDetailRepository,
            stubDoneTodoDetailRepository
        )
        service = new DoneTodoService(
            doneTodoRepository, 
            todoService, 
            detailService
        )
    })

    describe('load done todos with paging', () => {

        // load done todos with paging
        it('from 9 ~ 0, size: 3', async () => {
            const page1 = await service.loadDoneTodos('owner', 3, undefined)
            const page2 = await service.loadDoneTodos('owner', 3, 7)
            const page3 = await service.loadDoneTodos('owner', 3, 4)
            const page4 = await service.loadDoneTodos('owner', 3, 1)

            assert.deepEqual(page1.map(d => d.uuid), ['id:9', 'id:8', 'id:7'])
            assert.deepEqual(page2.map(d => d.uuid), ['id:6', 'id:5', 'id:4'])
            assert.deepEqual(page3.map(d => d.uuid), ['id:3', 'id:2', 'id:1'])
            assert.deepEqual(page4.map(d => d.uuid), ['id:0'])
        })

        // load done todos fail
        it('failed', async () => {
            spyDoneRepository.shouldFailLoad = true
            
            try {
                const p = await service.loadDoneTodos('owner', 3)
            } catch(error) {
                assert.deepEqual(error?.message, 'failed')
            }
        })
    })

    describe('put done todo' ,() => {

        // success
        it('success', async () => {
            const done = await service.putDoneTodo('owner', 'some', { some: 'value' })

            assert.deepEqual(done.uuid, 'some')
            assert.deepEqual(done.userId, 'owner')
        })

        // fail
        it('fail', async () => {
            spyDoneRepository.shouldFailSave = true

            try {
                const done = await service.putDoneTodo('owner', 'some', { some: 'value' })
            } catch (error) {
                assert.deepEqual(error?.message, 'failed')
            }
        })
    })

    describe('remove done todos', () => {

        // remove done todo past than
        it('past than 4', async () => {
            await service.removeDoneTodos('owner', 4);
            const all = await service.loadDoneTodos('owner', 10)
            assert.deepEqual(
                all.map(d => d.uuid), 
                ['id:9', 'id:8', 'id:7', 'id:6', 'id:5', 'id:4']
            )
            assert.deepEqual(
                stubDoneTodoDetailRepository.didRemoveDoneTodoDetailIds, 
                [
                    'id:0', 'id:1', 'id:2', 'id:3' 
                ]
            )
        })

        // remove all done todos
        it('all', async () => {
            await service.removeDoneTodos('owner');
            const all = await service.loadDoneTodos('owber', 10)
            assert.deepEqual(all.map(d => d.uuid), [])
          
            assert.deepEqual(
                stubDoneTodoDetailRepository.didRemoveDoneTodoDetailIds, 
                [
                    'id:0', 'id:1', 'id:2', 'id:3', 'id:4', 
                    'id:5', 'id:6', 'id:7', 'id:8', 'id:9', 
                ]
            )
        })

        it('past than -1 not exists', async () => {
            await service.removeDoneTodos('owner', -1)
            const all = await service.loadDoneTodos('owner', 10)
            assert.deepEqual(
                all.map(d => d.uuid), 
                [
                    'id:9', 'id:8', 'id:7', 'id:6', 'id:5', 'id:4', 
                    'id:3', 'id:2', 'id:1', 'id:0'
                ]
            )
            assert.deepEqual(
                stubDoneTodoDetailRepository.didRemoveDoneTodoDetailIds, 
                null
            )
        })

        // rmeove done todos fail
        it('faild', async () => {
            spyDoneRepository.shouldFailRemove = true
            
            try {
                await service.removeDoneTodos('owner');
            } catch(error) {
                assert.deepEqual(error?.message, 'failed')
            }
        })
    })

    describe('remove done todo', () => {

        it('success', async () => {
            await service.removeDoneTodo('id:3')
            const all = await service.loadDoneTodos('owner', 10)
            assert.deepEqual(
                all.map(d => d.uuid), 
                ['id:9', 'id:8', 'id:7', 'id:6', 'id:5', 'id:4', 'id:2', 'id:1', 'id:0']
            )
        })

        it('failed', async () => {
            spyDoneRepository.shouldFailRemove = true

            try {
                await service.removeDoneTodo('id:3')
            } catch (error) {
                assert.deepEqual(error?.message, 'failed')
            }
        })
    })

    describe('revert done todo', () => {

        // revert done todo
        it('success', async () => {
            const revert = await service.revertDoneTodo('owner', 'some')
            assert.deepEqual(revert.uuid, 'new')
            assert.deepEqual(spyDoneRepository.didRemovedDoneEventId, 'some')
        })

        // revert done todo fail
        it('failed', async () => {
            
            spyTodoRepository.shouldFailMakeTodo = true
            
            try {
                const revert = await service.revertDoneTodo('owner', 'some')
            } catch(error) {
                assert.deepEqual(error?.message, 'failed')
            }
        })
    })

    describe('revert done todo v2', () => {

        beforeEach(async () => {
            await stubDoneTodoDetailRepository.putData('some', { memo: 'some' })
        })

        // revert done todo
        it('success', async () => {
            const result = await service.revertDoneTodoV2('owner', 'some')
            assert.deepEqual(result.todo.uuid, 'new')
            assert.deepEqual(result.detail.eventId, 'new')
            assert.deepEqual(spyDoneRepository.didRemovedDoneEventId, 'some')
        })

        // revert done todo fail
        it('failed', async () => {
            spyTodoRepository.shouldFailMakeTodo = true

            const result = await service.revertDoneTodoV2('owner', 'some').catch(() => null)
            assert.deepEqual(result, null)
        })
    })

    describe('cancel done todo', () => {


        beforeEach(() => {
            spyTodoRepository.shouldFailRestore = false
            spyDoneRepository.shouldFailRemove = false
            spyDoneRepository.hasMatchingDoneTodoId = false
        })

        // cancel current todo
        it('cancel current todo', async () => {
            const origin = {name: 'current todo'}
            const canceled = await service.cancelDone("owner", 'current_todo', origin)
            assert.deepEqual(canceled.reverted != null, true)
            assert.deepEqual(canceled.done_id == null, true)
        })

        // cancel current todo fail
        it('cancel current todo fail', async () => {
            spyTodoRepository.shouldFailRestore = true

            const origin = {name: 'current todo'}

            const canceled = await service.cancelDone("owner", 'current_todo', origin).catch(() => null)
            assert.deepEqual(canceled, null)
        })

        // cancel todo with time
        describe('cancel todo with time', () => {

            const origin = {name: 'current todo', event_time: {
                time_type: 'at', timestamp: 12323.123123
            }}

            // not yet completed: done id not exists
            it('not yet completed + done not exists', async () => {

                spyDoneRepository.hasMatchingDoneTodoId = false

                const canceled = await service.cancelDone("owner", 'todo', origin)
                assert.deepEqual(canceled.reverted != null, true)
                assert.deepEqual(canceled.done_id == null, true)
            })

            it('already completed + done exists', async () => {

                spyDoneRepository.hasMatchingDoneTodoId = true

                const canceled = await service.cancelDone("owner", 'todo', origin)
                assert.deepEqual(canceled.reverted != null, true)
                assert.deepEqual(canceled.done_id != null, true)
            })

            it('already completed + done exists + fail to remove done, ignore', async () => {

                spyDoneRepository.shouldFailRemove = true
                spyDoneRepository.hasMatchingDoneTodoId = true

                const canceled = await service.cancelDone("owner", 'todo', origin)
                assert.deepEqual(canceled.reverted != null, true)
                assert.deepEqual(canceled.done_id == null, true)
            })

            // cancel todo with done id
            it('cancel todo with done id', async () => {
                const canceled = await service.cancelDone("owner", 'todo', origin, 'done_id')
                assert.deepEqual(canceled.reverted != null, true)
                assert.deepEqual(canceled.done_id != null, true)
            })
        })
    })
})