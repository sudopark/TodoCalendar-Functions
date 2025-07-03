
const DoneTodoService = require('../services/doneTodoService');
const EventTimeRangeService = require('../services/eventTimeRangeService');
const TodoServie = require('../services/todoEventService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');

describe("DoneTodoService", () => {

    let spyDoneRepository;
    let spyTodoRepository;
    let service;

    beforeEach(() => {
        const todoRepository = new StubRepos.Todo();
        const eventTimeRangeService = new EventTimeRangeService(
            new StubRepos.EventTime()
        )
        const doneTodoRepository = new StubRepos.DoneTodo();
        const todoService = new TodoServie( {todoRepository, eventTimeRangeService, doneTodoRepository});
        spyDoneRepository = doneTodoRepository
        spyTodoRepository = todoRepository
        service = new DoneTodoService(
            doneTodoRepository, 
            todoService
        )
    })

    describe('load done todos with paging', () => {

        // load done todos with paging
        it('from 9 ~ 0, size: 3', async () => {
            const page1 = await service.loadDoneTodos('owner', 3, undefined)
            const page2 = await service.loadDoneTodos('owner', 3, 7)
            const page3 = await service.loadDoneTodos('owner', 3, 4)
            const page4 = await service.loadDoneTodos('owner', 3, 1)

            assert(page1.map(d => d.uuid), ['id:9', 'id:8', 'id:7'])
            assert(page2.map(d => d.uuid), ['id:6', 'id:6', 'id:4'])
            assert(page3.map(d => d.uuid), ['id:3', 'id:2', 'id:1'])
            assert(page4.map(d => d.uuid), ['id:0'])
        })

        // load done todos fail
        it('failed', async () => {
            spyDoneRepository.shouldFailLoad = true
            
            try {
                const p = await service.loadDoneTodos('owner', 3)
            } catch(error) {
                assert(error?.message, 'failed')
            }
        })
    })

    describe('remove done todos', () => {

        // remove done todo past than
        it('past than 4', async () => {
            await service.removeDoneTodos('owner', 4);
            const all = await service.loadDoneTodos('owber', 10)
            assert(
                all.map(d => d.uuid), 
                ['id:9', 'id:8', 'id:7', 'id:6', 'id:5', 'id:4']
            )
        })

        // remove all done todos
        it('all', async () => {
            await service.removeDoneTodos('owner');
            const all = await service.loadDoneTodos('owber', 10)
            assert(all.map(d => d.uuid), [])
        })

        // rmeove done todos fail
        it('faild', async () => {
            spyDoneRepository.shouldFailRemove = true
            
            try {
                await service.removeDoneTodos('owner');
            } catch(error) {
                assert(error?.message, 'failed')
            }
        })
    })

    describe('revert done todo', () => {

        // revert done todo
        it('success', async () => {
            const revert = await service.revertDoneTodo('owner', 'some')
            assert(revert.uuid, 'new')
            assert(spyDoneRepository.didRemovedDoneEventId, 'some')
        })

        // revert done todo fail
        it('failed', async () => {
            
            spyTodoRepository.shouldFailMakeTodo = true
            
            try {
                const revert = await service.revertDoneTodo('owner', 'some')
            } catch(error) {
                assert(error?.message, 'failed')
            }
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
            assert(canceled.reverted != null, true)
            assert(canceled.done_id == null, true)
        })

        // cancel current todo fail
        it('cancel current todo fail', async () => {
            spyTodoRepository.shouldFailRestore = true

            const origin = {name: 'current todo'}

            try  {
                const canceled = await service.cancelDone("owner", 'current_todo', origin)
            } catch (error) {
                assert(error?.message, 'failed')
            }
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
                assert(canceled.reverted != null, true)
                assert(canceled.done_id == null, true)
            })

            it('already completed + done exists', async () => {

                spyDoneRepository.hasMatchingDoneTodoId = true

                const canceled = await service.cancelDone("owner", 'todo', origin)
                assert(canceled.reverted != null, true)
                assert(canceled.done_id != null, true)
            })

            it('already completed + done exists + fail to remove done, ignore', async () => {

                spyDoneRepository.shouldFailRemove = true
                spyDoneRepository.hasMatchingDoneTodoId = true

                const canceled = await service.cancelDone("owner", 'todo', origin)
                assert(canceled.reverted != null, true)
                assert(canceled.done_id == null, true)
            })

            // cancel todo with done id
            it('cancel todo with done id', async () => {
                const canceled = await service.cancelDone("owner", 'todo', origin, 'done_id')
                assert(canceled.reverted != null, true)
                assert(canceled.done_id != null, true)
            })
        })
    })
})