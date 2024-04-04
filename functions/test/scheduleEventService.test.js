
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
            assert.equal(newEvent.uuid, 'new');
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
                const range = stubEventTimeRepository.eventTimeMap.get('new');
                assert.equal(range.lower, 100);
                assert.equal(range.upper, 100);
                assert.equal(range.isTodo, false);
            });

            it('fail - when save time range fail', async () => {
                try {
                    const newEvent = await scheduleService.makeEvent('owner', makePayload);
                } catch(error) {
                    assert.equal(error != null, true)
                }
            })
        })
    });
});