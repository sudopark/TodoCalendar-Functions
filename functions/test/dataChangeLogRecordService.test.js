
const assert = require('assert');
const StubRepos = require('./stubs/stubRepositories');
const DataChangeLogRecordService = require('../services/dataChangeLogRecordService');
const ChangeLog = require('../models/DataChangeLog');
const DataType = require('../models/DataTypes');

describe('DataChangeLogRecordService', () => {

    let service;
    let syncReposiotry;
    let changeLogRepository;

    beforeEach(() => {
        syncReposiotry = new StubRepos.SyncTimeStamp()
        changeLogRepository = new StubRepos.ChangeLog()
        service = new DataChangeLogRecordService(
            syncReposiotry, changeLogRepository
        )
    })

    it('record log', async () => {
        const log = new ChangeLog.DataChangeLog(
            'some_id', 'some_user', ChangeLog.DataChangeCase.CREATED, 100
        )
        await  service.record(DataType.EventTag, log)

        const recordLogs = await changeLogRepository.findChanges(
            'some_user', DataType.EventTag, 99
        )
        const recordLog = recordLogs.find(log => {
            return log.uuid == 'some_id'
        })
        assert.deepEqual(recordLog, log)
        
        const syncTime = await syncReposiotry.syncTimestamp('some_user', DataType.EventTag)
        assert.deepEqual(syncTime.timestamp, 100)
    })

    it('when record fail, ignore', async () => {

        changeLogRepository.shouldFailUpdateLog = true

        const log = new ChangeLog.DataChangeLog(
            'some_id', 'some_user', ChangeLog.DataChangeCase.CREATED, 100
        )
        await service.record(DataType.EventTag, log)

        const recordLogs = await changeLogRepository.findChanges(
            'some_user', DataType.EventTag, 99
        )
        assert.deepEqual(recordLogs, [])
        
        const syncTime = await syncReposiotry.syncTimestamp('some_user', DataType.EventTag)
        assert.deepEqual(syncTime, null)
    })
})