
const ScheduleEventService = require('../services/scheduleEventService');
const assert = require('assert');
const EventTimeRangeService = require('../services/eventTimeRangeService');
const StubRepos = require("./stubs/stubRepositories");


describe('ScheduleEventService', () => {

    let stubEventTimeRepository;
    let stubScheduleReopository;
    let scheduleService;

    beforeEach(() => {
        stubEventTimeRepository = new StubRepos.EventTime();
        const eventTimeRangeService = new EventTimeRangeService(stubEventTimeRepository);
        stubScheduleReopository = new StubRepos.ScheduleEvent();
        scheduleService = new ScheduleEventService(stubScheduleReopository, eventTimeRangeService);
    })

    describe('make event', () => {

        const makePayload = {
            name: 'new event', 
            event_time: { time_type: 'at', timestamp: 100 }, 
        }

        it('success', async () => {
            const newEvent = await scheduleService.makeEvent('owner', makePayload);
            assert.equal(newEvent.uuid, 'some');
            assert.equal(newEvent.name, 'new event');
        });

        it('failed', async  () => {
            stubScheduleReopository.shouldFailMake = true
            
            try {
                const newEvent = await scheduleService.makeEvent('owner', makePayload);
            } catch(error) {
                assert.equal(error != null, true);
            }
        });

        describe('also save eventTime range', () => {

            it('success', async () => {
                const newEvent = await scheduleService.makeEvent('owner', makePayload);
                const range = stubEventTimeRepository.eventTimeMap.get('some');
                assert.equal(range.lower, 100);
                assert.equal(range.upper, 100);
                assert.equal(range.isTodo, false);
            });

            it('fail - when save time range fail', async () => {

                stubEventTimeRepository.shouldFailUpdateTime = true

                try {
                    const newEvent = await scheduleService.makeEvent('owner', makePayload);
                } catch(error) {
                    assert.equal(error != null, true)
                }
            })
        })
    });

    describe('put event', () => {
        const putPayload = {
            name: 'put event', 
            event_time: { time_type: 'at', timestamp: 300 }, 
        }

        it('success', async () => {
            const updated = await scheduleService.putEvent('owner', 'some', putPayload);
            assert.equal(updated.uuid, 'some');
            assert.equal(updated.name, 'put event');
            assert.equal(updated.event_time.timestamp, 300)
        })

        it('fail', async () => {

            stubScheduleReopository.shouldFailPut = true

            try {
                const updated = await scheduleService.putEvent('owner', 'some', putPayload);
            } catch (error) {
                assert.equal(error != null, true)
            }
        })

        describe('also update event time', () => {
            it('success', async () => {
                const updated = await scheduleService.putEvent('owner', 'some', putPayload);
                const range = stubEventTimeRepository.eventTimeMap.get('some');
                assert.equal(range.lower, 300);
                assert.equal(range.upper, 300);
                assert.equal(range.isTodo, false);
            });

            it('fail - when update time range fail', async () => {
                stubEventTimeRepository.shouldFailUpdateTime = true
                try {
                    const updated = await scheduleService.putEvent('owner', 'some', putPayload);
                } catch(error) {
                    assert.equal(error != null, true)
                }
            })
        })
    })

    describe('update event', () => {

        beforeEach(async () => {
            const makePayload = {
                name: 'old event', 
                event_time: { time_type: 'at', timestamp: 100 }, 
            }
            await scheduleService.makeEvent('owner', makePayload);
        })
        const updatePayload = {
            name: 'updated name'
        }

        it('success', async () => {
            const updated = await scheduleService.updateEvent('owner', 'some', updatePayload);
            assert.equal(updated.uuid, 'some');
            assert.equal(updated.name, 'updated name');
            assert.equal(updated.event_time.timestamp, 100)
        })

        it('failed', async () => {
            stubScheduleReopository.shouldFailUpdate = true

            try {
                await scheduleService.updateEvent('owner', 'some', updatePayload);
            } catch (error) {
                assert.equal(error != null, true)
            }
        })

        describe('also update event time', () => {

            const updateTimePayload = {
                event_time: { time_type: 'period',  period_start: 13, period_end: 200 }
            }
            it('success', async () => {
                await scheduleService.updateEvent('owner', 'some', updateTimePayload);
                const range = stubEventTimeRepository.eventTimeMap.get('some');
                assert.equal(range.lower, 13);
                assert.equal(range.upper, 200);
                assert.equal(range.isTodo, false);
            });

            it('fail - when update time range fail', async () => {
                stubEventTimeRepository.shouldFailUpdateTime = true
                try {
                    await scheduleService.updateEvent('owner', 'some', updateTimePayload);
                } catch(error) {
                    assert.equal(error != null, true)
                }
            })
        })
    });
});