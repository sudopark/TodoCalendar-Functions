
const assert = require('assert');
const StubRepos = require('./doubles/stubRepositories');
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

    describe('check sync', () => {
      
        describe('when server timestamp not exists', () => {
            
            beforeEach(() => {
                syncTimeRepository.syncTimestampMap = new Map()
            })

            it('check result is migration need: tag', async () => {
                
                const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 100)
                const response = await service.checkSync('some_user', DataType.EventTag, clientTimestamp);
                assert.deepEqual(response.result, Sync.CheckResult.migrationNeeds)
                assert.deepEqual(response.start, null)
                
                const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
                assert.deepEqual(
                    parseInt(updatedTimestamp.timestamp / 1000),
                    parseInt(Date.now() / 1000, 10)
                )
            })
        
            it('check result is migration need: todo', async () => {

                const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 100)
                const response = await service.checkSync('some_user', DataType.Todo, clientTimestamp);
                assert.deepEqual(response.result, Sync.CheckResult.migrationNeeds)
                assert.deepEqual(response.start, null)
                
                const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
                assert.deepEqual(
                    parseInt(updatedTimestamp.timestamp / 1000),
                    parseInt(Date.now() / 1000, 10)
                )
            })

            it('check result is migration need: schedule', async () => {

                const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 100)
                const response = await service.checkSync('some_user', DataType.Schedule, clientTimestamp);
                assert.deepEqual(response.result, Sync.CheckResult.migrationNeeds)
                assert.deepEqual(response.start, null)
                
                const updatedTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Schedule);
                assert.deepEqual(
                    parseInt(updatedTimestamp.timestamp / 1000),
                    parseInt(Date.now() / 1000, 10)
                )
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

            it('check result is no need: tag', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 100)
                const response = await service.checkSync('some_user', DataType.EventTag, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.noNeedToSync)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.EventTag, 100))
            })

            it('check result is no need: todo', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 100)
                const response = await service.checkSync('some_user', DataType.Todo, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.noNeedToSync)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Todo, 100))
            })

            it('check result is no need: schedule', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 100)
                const response = await service.checkSync('some_user', DataType.Schedule, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.noNeedToSync)

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

            it('check result is no need to sync: tag', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 200)
                const response = await service.checkSync('some_user', DataType.EventTag, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.noNeedToSync)
                assert.deepEqual(response.start, null)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.EventTag, 100))
            })

            it('check result is no need to sync: todo', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 200)
                const response = await service.checkSync('some_user', DataType.Todo, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.noNeedToSync)
                assert.deepEqual(response.start, null)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Todo, 100))
            })

            it('check result is no need to sync: schedule', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 200)
                const response = await service.checkSync('some_user', DataType.Schedule, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.noNeedToSync)
                assert.deepEqual(response.start, null)

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
            })

            it('check result is need to sync with start time: tag', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.EventTag, 100)
                const response = await service.checkSync('some_user', DataType.EventTag, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.needToSync)
                assert.deepEqual(response.start, 100)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.EventTag);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.EventTag, 200))
            })

            it('check result is need to sync with start time: todo', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.Todo, 100)
                const response = await service.checkSync('some_user', DataType.Todo, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.needToSync)
                assert.deepEqual(response.start, 100)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Todo);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Todo, 200))
            })

            it('check result is need to sync with start time: schedule', async () => {
                const clientTimestamp = new SyncTimestamp('some_user', DataType.Schedule, 100)
                const response = await service.checkSync('some_user', DataType.Schedule, clientTimestamp)
                assert.deepEqual(response.result, Sync.CheckResult.needToSync)
                assert.deepEqual(response.start, 100)

                const serverTimestamp = await syncTimeRepository.syncTimestamp('some_user', DataType.Schedule);
                assert.deepEqual(serverTimestamp, new SyncTimestamp('some_user', DataType.Schedule, 200))
            })
        })
    })

    describe('do sync', () => {

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
                    new ChangeLog.DataChangeLog('tag:1', 'some_user', ChangeLog.DataChangeCase.CREATED, 180), 
                    new ChangeLog.DataChangeLog('tag:2', 'some_user', ChangeLog.DataChangeCase.CREATED, 70), // 1
                    new ChangeLog.DataChangeLog('tag:3', 'some_user', ChangeLog.DataChangeCase.UPDATED, 190),
                    new ChangeLog.DataChangeLog('tag:4', 'some_user', ChangeLog.DataChangeCase.UPDATED, 80), // 2
                    new ChangeLog.DataChangeLog('tag:5', 'some_user', ChangeLog.DataChangeCase.DELETED, 130), // 4
                    new ChangeLog.DataChangeLog('tag:6', 'some_user', ChangeLog.DataChangeCase.DELETED, 90)  // 3
                ]
                changeLogRepository.allLogsMap.set(DataType.EventTag, tagLogs)
                
                // todos
                const todoLogs = [
                    new ChangeLog.DataChangeLog('todo:1', 'some_user', ChangeLog.DataChangeCase.CREATED, 180), 
                    new ChangeLog.DataChangeLog('todo:2', 'some_user', ChangeLog.DataChangeCase.CREATED, 70),
                    new ChangeLog.DataChangeLog('todo:3', 'some_user', ChangeLog.DataChangeCase.UPDATED, 190),
                    new ChangeLog.DataChangeLog('todo:4', 'some_user', ChangeLog.DataChangeCase.UPDATED, 80),
                    new ChangeLog.DataChangeLog('todo:5', 'some_user', ChangeLog.DataChangeCase.DELETED, 130),
                    new ChangeLog.DataChangeLog('todo:6', 'some_user', ChangeLog.DataChangeCase.DELETED, 90)
                ]
                changeLogRepository.allLogsMap.set(DataType.Todo, todoLogs)

                // schedules
                const scheduleLogs = [
                    new ChangeLog.DataChangeLog('sc:1', 'some_user', ChangeLog.DataChangeCase.CREATED, 180), 
                    new ChangeLog.DataChangeLog('sc:2', 'some_user', ChangeLog.DataChangeCase.CREATED, 70),
                    new ChangeLog.DataChangeLog('sc:3', 'some_user', ChangeLog.DataChangeCase.UPDATED, 190),
                    new ChangeLog.DataChangeLog('sc:4', 'some_user', ChangeLog.DataChangeCase.UPDATED, 80),
                    new ChangeLog.DataChangeLog('sc:5', 'some_user', ChangeLog.DataChangeCase.DELETED, 130),
                    new ChangeLog.DataChangeLog('sc:6', 'some_user', ChangeLog.DataChangeCase.DELETED, 90)
                ]
                changeLogRepository.allLogsMap.set(DataType.Schedule, scheduleLogs)

                eventTagRepository.isFindTagsAlwaysReplayIdsMocking = true
        })

        describe('start sync', () => {

            describe('when sync start timestamp not exists', () => {
                it('sync tag', async () => {
                    const response = await service.startSync('some_user', DataType.EventTag, null, 2)
                    assert.deepEqual(response.created.map(t => t.uuid), ["tag:2"])
                    assert.deepEqual(response.updated.map(t => t.uuid), ["tag:4"])
                    assert.deepEqual(response.deleted, [])
                    assert.deepEqual(response.newSyncTime, null)
                    assert.deepEqual(response.nextPageCursor, 'tag:4')
                })

                it('sync todo', async () => {
                    const response = await service.startSync('some_user', DataType.Todo, null, 2)
                    assert.deepEqual(response.created.map(t => t.uuid), ["todo:2"])
                    assert.deepEqual(response.updated.map(t => t.uuid), ["todo:4"])
                    assert.deepEqual(response.deleted, [])
                    assert.deepEqual(response.newSyncTime, null)
                    assert.deepEqual(response.nextPageCursor, 'todo:4')
                })

                it('sync schedule', async () => {
                    const response = await service.startSync('some_user', DataType.Schedule, null, 2)
                    assert.deepEqual(response.created.map(t => t.uuid), ["sc:2"])
                    assert.deepEqual(response.updated.map(t => t.uuid), ["sc:4"])
                    assert.deepEqual(response.deleted, [])
                    assert.deepEqual(response.newSyncTime, null)
                    assert.deepEqual(response.nextPageCursor, 'sc:4')
                })
            })

            describe('when sync start timestamp exiets', () => {
                it('sync tag', async () => {
                    const response = await service.startSync('some_user', DataType.EventTag, 100, 2)
                    assert.deepEqual(response.created.map(t => t.uuid), ["tag:1"])
                    assert.deepEqual(response.updated.map(t => t.uuid), [])
                    assert.deepEqual(response.deleted, ["tag:5"])
                    assert.deepEqual(response.newSyncTime, null)
                    assert.deepEqual(response.nextPageCursor, 'tag:1')
                })

                it('sync todo', async () => {
                    const response = await service.startSync('some_user', DataType.Todo, 100, 2)
                    assert.deepEqual(response.created.map(t => t.uuid), ["todo:1"])
                    assert.deepEqual(response.updated.map(t => t.uuid), [])
                    assert.deepEqual(response.deleted, ["todo:5"])
                    assert.deepEqual(response.newSyncTime, null)
                    assert.deepEqual(response.nextPageCursor, 'todo:1')
                })

                it('sync schedule', async () => {
                    const response = await service.startSync('some_user', DataType.Schedule, 100, 2)
                    assert.deepEqual(response.created.map(t => t.uuid), ["sc:1"])
                    assert.deepEqual(response.updated.map(t => t.uuid), [])
                    assert.deepEqual(response.deleted, ["sc:5"])
                    assert.deepEqual(response.newSyncTime, null)
                    assert.deepEqual(response.nextPageCursor, 'sc:1')
                })
            })

            describe('when only one page exists', () => {
                it('sync tag', async () => {
                    const response = await service.startSync('some_user', DataType.EventTag, null, 10)
                    assert.deepEqual(response.created.map(t => t.uuid), ['tag:2', 'tag:1'])
                    assert.deepEqual(response.updated.map(t => t.uuid), ['tag:4', 'tag:3'])
                    assert.deepEqual(response.deleted, ["tag:6", "tag:5"])
                    assert.deepEqual(response.newSyncTime, 200)
                    assert.deepEqual(response.nextPageCursor, null)
                })

                it('sync todo', async () => {
                    const response = await service.startSync('some_user', DataType.Todo, null, 10)
                    assert.deepEqual(response.created.map(t => t.uuid), ['todo:2', 'todo:1'])
                    assert.deepEqual(response.updated.map(t => t.uuid), ['todo:4', 'todo:3'])
                    assert.deepEqual(response.deleted, ["todo:6", "todo:5"])
                    assert.deepEqual(response.newSyncTime, 200)
                    assert.deepEqual(response.nextPageCursor, null)
                })

                it('sync schedule', async () => {
                    const response = await service.startSync('some_user', DataType.Schedule, null, 10)
                    assert.deepEqual(response.created.map(t => t.uuid), ['sc:2', 'sc:1'])
                    assert.deepEqual(response.updated.map(t => t.uuid), ['sc:4', 'sc:3'])
                    assert.deepEqual(response.deleted, ["sc:6", "sc:5"])
                    assert.deepEqual(response.newSyncTime, 200)
                    assert.deepEqual(response.nextPageCursor, null)
                })
            })
        })

        describe.only('continue sync until end', () => {

            it('continue sync tag', async () => {
                const response1 = await service.continueSync('some_user', DataType.EventTag, "tag:2", 3)
                assert.deepEqual(response1.created.map(t => t.uuid), [])
                assert.deepEqual(response1.updated.map(t => t.uuid), ['tag:4'])
                assert.deepEqual(response1.deleted, ['tag:6', 'tag:5'])
                assert.deepEqual(response1.newSyncTime, null)
                assert.deepEqual(response1.nextPageCursor, 'tag:5')

                const response2 = await service.continueSync('some_user', DataType.EventTag, "tag:5", 3)
                assert.deepEqual(response2.created.map(t => t.uuid), ['tag:1'])
                assert.deepEqual(response2.updated.map(t => t.uuid), ['tag:3'])
                assert.deepEqual(response2.deleted, [])
                assert.deepEqual(response2.newSyncTime, 200)
                assert.deepEqual(response2.nextPageCursor, null)
            })

            it('continue sync todo', async () => {
                const response1 = await service.continueSync('some_user', DataType.Todo, "todo:2", 3)
                assert.deepEqual(response1.created.map(t => t.uuid), [])
                assert.deepEqual(response1.updated.map(t => t.uuid), ['todo:4'])
                assert.deepEqual(response1.deleted, ['todo:6', 'todo:5'])
                assert.deepEqual(response1.newSyncTime, null)
                assert.deepEqual(response1.nextPageCursor, 'todo:5')

                const response2 = await service.continueSync('some_user', DataType.Todo, "todo:5", 3)
                assert.deepEqual(response2.created.map(t => t.uuid), ['todo:1'])
                assert.deepEqual(response2.updated.map(t => t.uuid), ['todo:3'])
                assert.deepEqual(response2.deleted, [])
                assert.deepEqual(response2.newSyncTime, 200)
                assert.deepEqual(response2.nextPageCursor, null)
            })

            it('continue sync schedule', async () => {
                const response1 = await service.continueSync('some_user', DataType.Schedule, "sc:2", 3)
                assert.deepEqual(response1.created.map(t => t.uuid), [])
                assert.deepEqual(response1.updated.map(t => t.uuid), ['sc:4'])
                assert.deepEqual(response1.deleted, ['sc:6', 'sc:5'])
                assert.deepEqual(response1.newSyncTime, null)
                assert.deepEqual(response1.nextPageCursor, 'sc:5')

                const response2 = await service.continueSync('some_user', DataType.Schedule, "sc:5", 3)
                assert.deepEqual(response2.created.map(t => t.uuid), ['sc:1'])
                assert.deepEqual(response2.updated.map(t => t.uuid), ['sc:3'])
                assert.deepEqual(response2.deleted, [])
                assert.deepEqual(response2.newSyncTime, 200)
                assert.deepEqual(response2.nextPageCursor, null)
            })
        })
    }) 

});