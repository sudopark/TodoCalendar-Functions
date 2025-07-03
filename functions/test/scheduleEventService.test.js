
const ScheduleEventService = require('../services/scheduleEventService');
const assert = require('assert');
const EventTimeRangeService = require('../services/eventTimeRangeService');
const StubRepos = require("./doubles/stubRepositories");
const constants = require('../Utils/constants');


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

    describe('make new event with exclude repeating time', () => {

        const payload = {
            name: 'copy event', 
            event_time: { time_type: 'at', timestamp: 100 }, 
        }

        beforeEach(async () => {
            stubScheduleReopository.shouldFailPut = false
            const oldWithExclude = {...payload, exclude_repeatings: ['time1', 'time2']}
            const oldWithoutExclude = {...payload }
            await stubScheduleReopository.putEvent('with_exclude', oldWithExclude)
            await stubScheduleReopository.putEvent('without_exclude', oldWithoutExclude)
        })

        it('success - old value has exclude', async () => {
            const result = await scheduleService.makeNewEventWithExcludeFromRepeating(
                'owner', 'with_exclude', 'some_time', payload
            )
            assert.equal(result.new_schedule.name, 'copy event')
            assert.equal(result.updated_origin.uuid, 'with_exclude')
            assert.equal(
                result.updated_origin.exclude_repeatings.toString(), 
                ['time1', 'time2', 'some_time'].toString()
            )
        })

        it('success - old value has no exclude', async () => {
            const result = await scheduleService.makeNewEventWithExcludeFromRepeating(
                'owner', 'without_exclude', 'some_time', payload
            )
            assert.equal(result.new_schedule.name, 'copy event')
            assert.equal(result.updated_origin.uuid, 'without_exclude')
            assert.equal(
                result.updated_origin.exclude_repeatings.toString(), 
                ['some_time'].toString()
            )
        })

        it('fail', async () => {

            stubScheduleReopository.shouldFailMake = true
            try {
                await scheduleService.makeNewEventWithExcludeFromRepeating(
                    'owner', 'without_exclude', 'some_time', payload
                )
            } catch (error) {
                assert.equal(error != null, true)
            }
        })

        it('also save time range', async () => {
            const result = await scheduleService.makeNewEventWithExcludeFromRepeating(
                'owner', 'with_exclude', 'some_time', payload
            )
            const range = stubEventTimeRepository.eventTimeMap.get(result.new_schedule.uuid)
            assert.equal(range.lower, 100);
            assert.equal(range.upper, 100);
            assert.equal(range.isTodo, false);
        })
    })

    describe('exclude repeating', () => {
        const payload = {
            name: 'repeating event', 
            event_time: { time_type: 'at', timestamp: 100 }, 
        }
        beforeEach(async () => {
            stubScheduleReopository.shouldFailUpdate = false
            const old = {...payload, exclude_repeatings: ['time1', 'time2']}
            await stubScheduleReopository.putEvent('origin', old)
        })

        it('success', async () => {
            const result = await scheduleService.excludeRepeating('origin', 'new_time')
            assert.equal(result.uuid, 'origin')
            assert.equal(result.name, 'repeating event')
        })

        it('fail', async () => {
            stubScheduleReopository.shouldFailUpdate = true

            try {
                await scheduleService.excludeRepeating(
                    'origin', 'new_time'
                )
            } catch (error) {
                assert.equal(error != null, true)
            }
        })
    })

    describe('branch new repeating event from origin', () => {

        const payload = {
            name: 'origin', 
            event_time: { time_type: 'at', timestamp: 100 }, 
            repeating: { start: 100, option: { optionType: 'every_day', interval: 1 }}
        }

        const payloadHasEndcount = {
            name: 'origin', 
            event_time: { time_type: 'at', timestamp: 100 }, 
            repeating: { start: 100, option: { optionType: 'every_day', interval: 1 }, end_count: 10}
        }

        const newPayload = {
            name: 'branch', 
            event_time: { time_type: 'at', timestamp: 200 }, 
            repeating: { start: 200, option: { optionType: 'every_day', interval: 1 }}
        }

        beforeEach(async () => {
            stubScheduleReopository.shouldFailPut = false
            await stubScheduleReopository.putEvent('origin', {...payload})
            await stubScheduleReopository.putEvent('origin_has_endcount', payloadHasEndcount)
        })

        it('success', async () => {
            const result = await scheduleService.branchNewRepeatingEvent(
                'owner', 'origin', 200, newPayload
            )
            assert.equal(result.new.name, 'branch')
            assert.equal(result.origin.uuid, 'origin')
            assert.equal(result.origin.repeating.end, 200)
        })

        it('if origin event has end count, remove and save end time', async () => {
            const result = await scheduleService.branchNewRepeatingEvent(
                'owner', 'origin_has_endcount', 200, newPayload
            )
            assert.equal(result.new.name, 'branch')
            assert.equal(result.origin.uuid, 'origin_has_endcount')
            assert.equal(result.origin.repeating.end, 200)
            assert.equal(result.origin.repeating.end_count, null)
        })

        it('fail', async () => {

            stubScheduleReopository.shouldFailPut = true
            try {
                await scheduleService.branchNewRepeatingEvent(
                    'owner', 'origin', 200, newPayload
                )
            } catch (error) {
                assert.equal(error != null, true)
            }
        })

        it('also save time range', async () => {
            const result = await scheduleService.branchNewRepeatingEvent(
                'owner', 'origin', 200, newPayload
            )
            const updatedOriginRange = stubEventTimeRepository.eventTimeMap.get(result.origin.uuid)
            assert.equal(updatedOriginRange.lower, 100)
            assert.equal(updatedOriginRange.upper, 200)
            assert.equal(updatedOriginRange.isTodo, false)
            const newRange = stubEventTimeRepository.eventTimeMap.get(result.new.uuid)
            assert.equal(newRange.lower, 200);
            assert.equal(newRange.upper, constants.eventTimeMaxUpperBound);
            assert.equal(newRange.isTodo, false);
        })
    })

    describe('remove event', () => {

        beforeEach(async () => {
            const payload = {
                name: 'old event', 
                event_time: { time_type: 'at', timestamp: 100 }, 
            }
            await scheduleService.putEvent('owner', 'old_event', payload)
        })

        it('success', async () => {
            await scheduleService.removeEvent('old_event')
            const event = stubScheduleReopository.eventMap.get('old_event')
            const time = stubEventTimeRepository.eventTimeMap.get('old_event')
            assert.equal(event == null, true)
            assert.equal(time == null, true)
        })
    })

    describe('remove event with tagId', () => {

        beforeEach(() => {
            stubEventTimeRepository.removeIds = null;
            stubScheduleReopository.spyEventMap = new Map()
            stubScheduleReopository.spyEventMap.set(
                'event_without_tag', {uuid: 'event_without_tag'}
            )
            stubScheduleReopository.spyEventMap.set(
                'event_with_tag1', {uuid: 'event_with_tag1', event_tag_id: 'tag1'}
            )
            stubScheduleReopository.spyEventMap.set(
                'event_with_tag2', {uuid: 'event_with_tag2', event_tag_id: 'tag2'}
            )
            stubScheduleReopository.spyEventMap.set(
                'event_with_tag1_1', {uuid: 'event_with_tag1_1', event_tag_id: 'tag1'}
            )
        })

        it('tagId에 해당하는 schedule 삭제', async () => {

            const ids = await scheduleService.removeAllEventsWithTagId('tag1')
            const eventAfterRemoveIds = [...stubScheduleReopository.spyEventMap].map(([k, v]) => k)
            assert.deepEqual(ids, ['event_with_tag1', 'event_with_tag1_1'])
            assert.deepEqual(eventAfterRemoveIds, ['event_without_tag', 'event_with_tag2'])
            assert.deepEqual(stubEventTimeRepository.removeIds, ['event_with_tag1', 'event_with_tag1_1'])
        })
    })

    describe('get event', () => {

        beforeEach(async () => {
            const payload = {
                name: 'event', 
                event_time: { time_type: 'at', timestamp: 100 }, 
            }
            await scheduleService.putEvent('owner', 'some', payload)
        })

        it('success', async () => {
            const event = await scheduleService.getEvent('some')
            assert.equal(event.name, 'event')
        });

        it('fail when not exists', async () => {
            try {
                const event = await scheduleService.getEvent('not exists')
            } catch(error) {
                assert.equal(error != null, true)
            }
        })
    })

    describe('find events', () => {

        it('success', async () => {
            const events = await scheduleService.findEvents('owner', 0, 10)
            assert.equal(events.length, 10)
        })

        it('success: total count more than 30', async () => {
            const events = await scheduleService.findEvents('owner', 0, 100)
            assert.equal(events.length, 100)
        })
    })
});