
const assert = require('assert');
const StubRepos = require('./stubs/stubRepositories');
const DataSyncService = require('../services/dataSyncService');
const DataType = require('../models/DataTypes');
const Sync = require('../models/SyncResponse')
const SyncTimestamp = require('../models/SyncTimestamp');
const ChangeLog = require('../models/DataChangeLog')

describe('DataSyncService', () => {

    // 서버 타임스탬프가 없는 경우, 전체 데이터 다 마이그레이션
    let syncTimeRepository;
    let changeLogRepository;
    let eventTagRepository;
    let todoRepository;
    let scheduleRepository;
    let service;
    
    let allTagIds;
    let allTodoIds;
    let allScheduleIds;

    beforeEach(() => {
        syncTimeRepository = new StubRepos.SyncTimeStamp();
        changeLogRepository = new StubRepos.ChangeLog();
        eventTagRepository = new StubRepos.EventTag();
        todoRepository = new StubRepos.Todo();
        scheduleRepository = new StubRepos.ScheduleEvent();

        service = new DataSyncService(
            syncTimeRepository, changeLogRepository, 
            eventTagRepository, todoRepository, scheduleRepository
        )

        allTagIds = Array.from({ length: 10}, (_, i) => i).map(i => { return `tag:${i}` })
        const tags = allTagIds.map(id => {
            return { uuid: id, userId: 'some_user' }
        })
        eventTagRepository.eventTagMap = tags.reduce((acc, tag) => {
            acc.set(tag.uuid, tag)
            return acc
        }, new Map());

        allTodoIds = Array.from({length: 10}, (_, i) => i).map(i => { return `todo:${i}` })
        allScheduleIds = Array.from({length: 10}, (_, i) => i).map(i => { return `sc:${i}` })
    })

    describe('when client timestamp not exists', () => {

        it('sync all event tag datas', async () => {

            const response = await service.sync('some_user', DataType.EventTag, null);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allTagIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.EventTag)
            assert.deepEqual( 
                parseInt(response.newSyncTime.timestamp / 1000, 10), 
                parseInt(Date.now() / 1000, 10)
            )
            const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
            assert.deepEqual(response.newSyncTime, updatedTimestamp)
        })
        
        it('sync all todo datas', async () => {

            const response = await service.sync('some_user', DataType.Todo, null);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allTodoIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.Todo)
            assert.deepEqual( 
                parseInt(response.newSyncTime.timestamp / 1000, 10), 
                parseInt(Date.now() / 1000, 10)
            )
            const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
            assert.deepEqual(response.newSyncTime, updatedTimestamp)
        })

        it('sync all schedule datas', async () => {

            const response = await service.sync('some_user', DataType.Schedule, null);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allScheduleIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.Schedule)
            assert.deepEqual( 
                parseInt(response.newSyncTime.timestamp / 1000, 10), 
                parseInt(Date.now() / 1000, 10)
            )
            const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Schedule);
            assert.deepEqual(response.newSyncTime, updatedTimestamp)
        })
    })

    describe('when server timestamp not exists', () => {

        beforeEach(() => {
            syncTimeRepository.syncTimestampMap = new Map()
        })

        it('sync all event tag datas', async () => {
            
            const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 100)
            const response = await service.sync('some_user', DataType.EventTag, clientTimestamp);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allTagIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.EventTag)
            assert.deepEqual( 
                parseInt(response.newSyncTime.timestamp / 1000, 10), 
                parseInt(Date.now() / 1000, 10)
            )
            const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
            assert.deepEqual(response.newSyncTime, updatedTimestamp)
        })
        
        it('sync all todo datas', async () => {

            const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 100)
            const response = await service.sync('some_user', DataType.Todo, clientTimestamp);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allTodoIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.Todo)
            assert.deepEqual( 
                parseInt(response.newSyncTime.timestamp / 1000, 10), 
                parseInt(Date.now() / 1000, 10)
            )
            const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
            assert.deepEqual(response.newSyncTime, updatedTimestamp)
        })

        it('sync all schedule datas', async () => {

            const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 100)
            const response = await service.sync('some_user', DataType.Schedule, clientTimestamp);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allScheduleIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.Schedule)
            assert.deepEqual( 
                parseInt(response.newSyncTime.timestamp / 1000, 10), 
                parseInt(Date.now() / 1000, 10)
            )
            const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Schedule);
            assert.deepEqual(response.newSyncTime, updatedTimestamp)
        })
    })

    // 클라와 서버의 타임스탬프가 동일하다면 싱크 필요 없음
    describe('when client timestamp and server timestamp are equal', () => {

        beforeEach(async () => {
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.EventTag, 100)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Todo, 100)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Schedule, 100)
            )
        })

        it('no need to sync event tag', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 100)
            const response = await service.sync('some_user', DataType.EventTag, clientTimestamp)
            assert.deepEqual(response, Sync.Response.noNeedToSync)

            const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
            assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.EventTag, 100))
        })

        it('no need to sync todo', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 100)
            const response = await service.sync('some_user', DataType.Todo, clientTimestamp)
            assert.deepEqual(response, Sync.Response.noNeedToSync)

            const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
            assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Todo, 100))
        })

        it('no need to sync schedule', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 100)
            const response = await service.sync('some_user', DataType.Schedule, clientTimestamp)
            assert.deepEqual(response, Sync.Response.noNeedToSync)

            const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Schedule);
            assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Schedule, 100))
        })
    })

    // 클라의 타임스탬프가 더 미래시간이라면, 서버 타임스탬프를 업데이트하고, 싱크는 불필요함을 알림
    describe('when client timestamp is future than server timestamp', () => {
        
        beforeEach(async() => {
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.EventTag, 100)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Todo, 100)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Schedule, 100)
            )
        })

        it('no need to sync eventTag and update server timestamp to client timestamp', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 200)
            const response = await service.sync('some_user', DataType.EventTag, clientTimestamp)
            assert.deepEqual(response, Sync.Response.noNeedToSync)

            const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
            assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.EventTag, 100))
        })

        it('no need to sync todo and update server timestamp to client timestamp', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 200)
            const response = await service.sync('some_user', DataType.Todo, clientTimestamp)
            assert.deepEqual(response, Sync.Response.noNeedToSync)

            const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
            assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Todo, 100))
        })

        it('no need to sync schedule and update server timestamp to client timestamp', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 200)
            const response = await service.sync('some_user', DataType.Schedule, clientTimestamp)
            assert.deepEqual(response, Sync.Response.noNeedToSync)

            const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Schedule);
            assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Schedule, 100))
        })
    })

    describe('when server timestamp is future than client timestamp', () => {

        beforeEach(async () => {
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.EventTag, 200)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Todo, 200)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Schedule, 200)
            )

            // tags
            const tagLogs = [
                new ChangeLog.DataChangeLog('tag1-created', 'some_user', ChangeLog.DataChangeCase.CREATED, 180), 
                new ChangeLog.DataChangeLog('tag2-created', 'some_user', ChangeLog.DataChangeCase.CREATED, 80),
                new ChangeLog.DataChangeLog('tag1-updated', 'some_user', ChangeLog.DataChangeCase.UPDATED, 190),
                new ChangeLog.DataChangeLog('tag2-updated', 'some_user', ChangeLog.DataChangeCase.UPDATED, 80),
                new ChangeLog.DataChangeLog('tag1-deleted', 'some_user', ChangeLog.DataChangeCase.DELETED, 130),
                new ChangeLog.DataChangeLog('tag2-deleted', 'some_user', ChangeLog.DataChangeCase.DELETED, 90)
            ]
            changeLogRepository.allLogsMap.set(DataType.EventTag, tagLogs)
            
            // todos
            const todoLogs = [
                new ChangeLog.DataChangeLog('todo1-created', 'some_user', ChangeLog.DataChangeCase.CREATED, 181), 
                new ChangeLog.DataChangeLog('todo2-created', 'some_user', ChangeLog.DataChangeCase.CREATED, 81),
                new ChangeLog.DataChangeLog('todo1-updated', 'some_user', ChangeLog.DataChangeCase.UPDATED, 191),
                new ChangeLog.DataChangeLog('todo2-updated', 'some_user', ChangeLog.DataChangeCase.UPDATED, 81),
                new ChangeLog.DataChangeLog('todo1-deleted', 'some_user', ChangeLog.DataChangeCase.DELETED, 131),
                new ChangeLog.DataChangeLog('todo2-deleted', 'some_user', ChangeLog.DataChangeCase.DELETED, 91)
            ]
            changeLogRepository.allLogsMap.set(DataType.Todo, todoLogs)

            // schedules
            const scheduleLogs = [
                new ChangeLog.DataChangeLog('sc1-created', 'some_user', ChangeLog.DataChangeCase.CREATED, 182), 
                new ChangeLog.DataChangeLog('sc2-created', 'some_user', ChangeLog.DataChangeCase.CREATED, 81), 
                new ChangeLog.DataChangeLog('sc1-updated', 'some_user', ChangeLog.DataChangeCase.UPDATED, 201), 
                new ChangeLog.DataChangeLog('sc2-updated', 'some_user', ChangeLog.DataChangeCase.UPDATED, 81), 
                new ChangeLog.DataChangeLog('sc1-deleted', 'some_user', ChangeLog.DataChangeCase.DELETED, 133), 
                new ChangeLog.DataChangeLog('sc2-deleted', 'some_user', ChangeLog.DataChangeCase.DELETED, 91)
            ]
            changeLogRepository.allLogsMap.set(DataType.Schedule, scheduleLogs)

            eventTagRepository.isFindTagsAlwaysReplayIdsMocking = true
        })

        it('sync server event tag data to client', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 100)
            const response = await service.sync('some_user', DataType.EventTag, clientTimestamp)
            assert.deepEqual(response.checkResult, Sync.CheckResult.needToSync)
            assert.deepEqual(response.created.length, 1)
            assert.deepEqual(response.created[0].uuid, 'tag1-created')
            assert.deepEqual(response.updated.length, 1)
            assert.deepEqual(response.updated[0].uuid, 'tag1-updated')
            assert.deepEqual(response.deleted.length, 1)
            assert.deepEqual(response.deleted[0], 'tag1-deleted')
            assert.deepEqual(response.newSyncTime, new SyncTimestamp('some_user', DataType.EventTag, 200))
        })

        it('sync server todo data to client', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 100)
            const response = await service.sync('some_user', DataType.Todo, clientTimestamp)
            assert.deepEqual(response.checkResult, Sync.CheckResult.needToSync)
            assert.deepEqual(response.created.length, 1)
            assert.deepEqual(response.created[0].uuid, 'todo1-created')
            assert.deepEqual(response.updated.length, 1)
            assert.deepEqual(response.updated[0].uuid, 'todo1-updated')
            assert.deepEqual(response.deleted.length, 1)
            assert.deepEqual(response.deleted[0], 'todo1-deleted')
            assert.deepEqual(response.newSyncTime, new SyncTimestamp('some_user', DataType.Todo, 200))
        })

        it('sync server schedule data to client', async () => {
            const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 100)
            const response = await service.sync('some_user', DataType.Schedule, clientTimestamp)
            assert.deepEqual(response.checkResult, Sync.CheckResult.needToSync)
            assert.deepEqual(response.created.length, 1)
            assert.deepEqual(response.created[0].uuid, 'sc1-created')
            assert.deepEqual(response.updated.length, 1)
            assert.deepEqual(response.updated[0].uuid, 'sc1-updated')
            assert.deepEqual(response.deleted.length, 1)
            assert.deepEqual(response.deleted[0], 'sc1-deleted')
            assert.deepEqual(response.newSyncTime, new SyncTimestamp('some_user', DataType.Schedule, 200))
        })
    })

    describe('sync all datas', () => {

        beforeEach(async () => {
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.EventTag, 200)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Todo, 200)
            )
            await syncTimeRepository.updateTimestamp(
                new SyncTimestamp('some_user', DataType.Schedule, 200)
            )
        })

        it('event tag', async () => {
            const response = await service.syncAll('some_user', DataType.EventTag);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allTagIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.EventTag)
            assert.deepEqual( response.newSyncTime.timestamp, 200)
        })

        it('todo', async () => {
            const response = await service.syncAll('some_user', DataType.Todo);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allTodoIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.Todo)
            assert.deepEqual( response.newSyncTime.timestamp, 200)
        })

        it('schedule', async () => {
            const response = await service.syncAll('some_user', DataType.Schedule);
            assert.deepEqual(response.checkResult, Sync.CheckResult.migrationNeeds)
            assert.deepEqual(response.created, null)
            assert.deepEqual(response.updated.map(t => t.uuid), allScheduleIds)
            assert.deepEqual(response.deleted, null)
            assert.deepEqual(response.newSyncTime.userId, 'some_user')
            assert.deepEqual(response.newSyncTime.dataType, DataType.Schedule)
            assert.deepEqual( response.newSyncTime.timestamp, 200)
        })
    })
});