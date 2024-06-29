
const ForemostEventService = require('../services/foremostEventService');
const assert = require('assert');
const StubRepos = require('./stubs/stubRepositories');


describe('ForemostEventService', () => {

    let stubForemostIdRepository;
    let service;

    beforeEach(() => {
        const todoRepository = new StubRepos.Todo();

        const scheduleRepository = new StubRepos.ScheduleEvent();
        const scheule = { uuid: 'schedule', name: 'schedule' }
        scheduleRepository.putEvent('schedule', scheule);

        const foremostIdRepostory = new StubRepos.Foremost();
        stubForemostIdRepository = foremostIdRepostory
        stubForemostIdRepository.updateForemostEventId('user', {event_id: 'origin', is_todo: true})
        service = new ForemostEventService(foremostIdRepostory, todoRepository, scheduleRepository)
    })

    describe('load foremost event: todo', () => {

        // tood
        it('exists', async () => {
            const event = await service.getForemostEvent('user')
            assert(event.event_id, "origin")
            assert(event.is_todo == true)
            assert(event.event != null)
        })        

        // not exists
        it('not exists', async () => {
            const eventForAnothoerUser = await service.getForemostEvent('another')
            assert(eventForAnothoerUser == null)
        })

        // load fail
        it('when fail, throw error', async () => {
            stubForemostIdRepository.shouldFail = true
            try {
                const event = await service.getForemostEvent('user')
            } catch (error) {
                assert(error.message, 'failed')
            }
        })
    })

    describe('load foremost event: schedule', () => {
        beforeEach(() => {
            stubForemostIdRepository.updateForemostEventId('user', {event_id: 'schedule', is_todo: false})
        })

        // tood
        it('exists', async () => {
            const event = await service.getForemostEvent('user')
            assert(event.event_id, "schedule")
            assert(event.is_todo == false)
            assert(event.event != null)
        })        

        // not exists
        it('not exists', async () => {
            const eventForAnothoerUser = await service.getForemostEvent('another')
            assert(eventForAnothoerUser == null)
        })

        // load fail
        it('when fail, throw error', async () => {
            stubForemostIdRepository.shouldFail = true
            try {
                const event = await service.getForemostEvent('user')
            } catch (error) {
                assert(error.message, 'failed')
            }
        })
    })

    describe('update', () => {

        it('success', async () => {
            const event = await service.updateForemostEvent('user', {
                event_id: 'schedule', is_todo: false
            })
            assert(event.event_id, "schedule")
            assert(event.is_todo == false)
            assert(event.event != null)
        })

        it("fail", async () => {
            stubForemostIdRepository.shouldFail = true
            stubForemostIdRepository.shouldFail = true
            try {
                const event = await service.updateForemostEvent('user', {
                    event_id: 'schedule', is_todo: false
                })
            } catch (error) {
                assert(error.message, 'failed')
            }
        })
    })

    describe('remove', () => {

        it('success', async() => {
            assert(stubForemostIdRepository.eventIdMap.get('user') != null)
            await service.removeForemostEvent('user')
            assert(stubForemostIdRepository.eventIdMap.get('user') == null)
        })

        it('fail', async () => {
            try {
                await service.removeForemostEvent('user')
            } catch (error) {
                assert(error.message, 'failed')
            }
        })
    })
})