
const MigrationService = require('../services/migrationService');
const EventTimeRangeService = require('../services/eventTimeRangeService');
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');
const SpyChangeLogRecordService = require('./doubles/spyChangeLogRecordService');
const DataTypes = require('../models/DataTypes');

describe('MigrationService', () => {

    let stubReposiotry;
    let spyChangeLogRecordService;
    let service;

    beforeEach(() => {
        stubReposiotry = new StubRepos.Migration();
        const evenTTimeRepository = new StubRepos.EventTime();
        const eventTimeRangeService = new EventTimeRangeService(evenTTimeRepository)
        spyChangeLogRecordService = new SpyChangeLogRecordService()
        service = new MigrationService(
            stubReposiotry, 
            eventTimeRangeService,
            spyChangeLogRecordService
        )
    })

    describe('migrate event tag', () => {

        const tags = {
            't1': {name: 'n1', color_hex: 'some'}, 
            't2': {name: 'n2', color_hex: 'some'}, 
        }

        it('success', async () => {

            await service.migrationEventTags(tags)
            assert.equal(Object.keys(stubReposiotry.didMigratedTags).length, 2)

            const logIds = spyChangeLogRecordService.logMap.get(DataTypes.EventTag)
                .map(log => log.uuid)
            assert.deepEqual(logIds, ['t1', 't2'])
        })

        it('fail', async () => {
            stubReposiotry.shouldFail = true

            try {
                await service.migrationEventTags(tags)
            } catch (error) {
                assert.equal(error != null, true)
            }
            assert.equal(Object.keys(stubReposiotry.didMigratedTags || {}).length, 0)
        })
    })

    describe('migrate todo events', () => {

        const todos = {
            't1': { name: 't1' }, 
            't2': { name: 't2', event_time: { time_type: 'at', timestamp: 100 } }
        }

        it('success', async () => {
            await service.migrationTodos('uid', todos);
            assert.equal(Object.keys(stubReposiotry.didMigratedTodos).length, 2)
            assert.equal(stubReposiotry.didMigratedEventTimeRanges.size, 2)

            const logIds = spyChangeLogRecordService.logMap.get(DataTypes.Todo)
                .map(log => log.uuid)
            assert.deepEqual(logIds, ['t1', 't2'])
        })

        it('failed', async () => {
            stubReposiotry.shouldFail = true

            try {
                await service.migrationTodos('uid', todos);
            } catch (error) {
                assert.equal(error != null, true)
            }
            assert.equal(Object.keys(stubReposiotry.didMigratedTodos || {}).length, 0)
            assert.equal(stubReposiotry.didMigratedEventTimeRanges?.size ?? 0, 0)
        })
    })

    describe('migrate schedule events', () => {

        const schedules = {
            'sc1': { name: 's1', event_time: { time_type: 'at', timestamp: 100 } }, 
            'sc2': { name: 's2', event_time: { time_type: 'at', timestamp: 100 } }
        }

        it('success', async () => {
            await service.migrationSchedules('uid', schedules);
            assert.equal(Object.keys(stubReposiotry.didMigratedSchedules).length, 2)
            assert.equal(stubReposiotry.didMigratedEventTimeRanges.size, 2)

            const logIds = spyChangeLogRecordService.logMap.get(DataTypes.Schedule)
                .map(log => log.uuid)
            assert.deepEqual(logIds, ['sc1', 'sc2'])
        })

        it('failed', async () => {
            stubReposiotry.shouldFail = true

            try {
                await service.migrationSchedules('uid', schedules);
            } catch (error) {
                assert.equal(error != null, true)
            }
            assert.equal(Object.keys(stubReposiotry.didMigratedSchedules || {}).length, 0)
            assert.equal(stubReposiotry.didMigratedEventTimeRanges?.size ?? 0, 0)
        })
    })

    describe('migrate event details', () => {

        const details = {
            'e1': {memo: 'some'}, 
            'e2': {memo: 'some'}, 
        }

        it('success', async () => {

            await service.migrationEventDetails(details)
            assert.equal(Object.keys(stubReposiotry.didMigratedDetails).length, 2)
        })

        it('fail', async () => {
            stubReposiotry.shouldFail = true

            try {
                await service.migrationEventDetails(details)
            } catch (error) {
                assert.equal(error != null, true)
            }
            assert.equal(Object.keys(stubReposiotry.didMigratedDetails || {}).length, 0)
        })
    })

    describe('migrate done Todo events', () => {

        const dones = {
            'd1': {origin_event_id: 't1', done_at: 100}, 
            'd2': {origin_event_id: 't2', done_at: 200}, 
        }

        it('success', async () => {

            await service.migrationDoneTodoEvents(dones)
            assert.equal(Object.keys(stubReposiotry.didMigratedDoneTodoEvents).length, 2)
        })

        it('fail', async () => {
            stubReposiotry.shouldFail = true

            try {
                await service.migrationDoneTodoEvents(dones)
            } catch (error) {
                assert.equal(error != null, true)
            }
            assert.equal(Object.keys(stubReposiotry.didMigratedDoneTodoEvents || {}).length, 0)
        })
    })
});