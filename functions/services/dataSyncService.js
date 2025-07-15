
const ChangeLogs = require('../models/DataChangeLog');
const DataTypes = require('../models/DataTypes');
const SyncTimeStamp = require('../models/SyncTimestamp');
const { CheckResult, CheckResponse, Response } = require('../models/SyncResponse')
const { chunk } = require('../Utils/functions')

class DataSyncService {

    constructor(
        synctimeRepository, changeLogRepository, 
        eventTagRepository, todoRepository, scheduleRepository
    ) {
        this.synctimeRepository = synctimeRepository
        this.changeLogRepository = changeLogRepository
        this.eventTagRepository = eventTagRepository
        this.todoRepository = todoRepository
        this.scheduleRepository = scheduleRepository
    }

    async checkSync(userId, dataType, clientTimestamp) {
        const serverTimestamp = await this.synctimeRepository.syncTimestamp(userId, dataType);
        if(!serverTimestamp) {
            await this.#updateServerTimestamp(userId, dataType)
            return new CheckResponse(CheckResult.migrationNeeds)

        } else if(clientTimestamp.timestamp === serverTimestamp.timestamp) {
            return new CheckResponse(CheckResult.noNeedToSync)

        } else if(clientTimestamp.timestamp > serverTimestamp.timestamp) {
            return new CheckResponse(CheckResult.noNeedToSync)
            
        }  else {
            return new CheckResponse(CheckResult.needToSync)
                .setStart(clientTimestamp.timestamp)
        }
    }

    /// timestamp는 optional, 없으면 그냥 처음부터 / 있으면 해당 타임스탬프 보다 큰 지점부터
    async startSync(userId, dataType, timestamp, pageSize) {
        const logs = await this.changeLogRepository.findChanges(userId, dataType, timestamp, pageSize)
        const response = await this.#makeSyncResponseWithDatas(dataType, logs)
        if(logs.length < pageSize) {
            const serverTimestamp = await this.synctimeRepository.syncTimestamp(userId, dataType)
            response.setNextPageCursor(null)
            response.setSynctime(serverTimestamp.timestamp)
        }
        return response
    }

    async continueSync(userId, dataType, afterCursor, pageSize) {
        const logs = await this.changeLogRepository.loadChanges(userId, dataType, afterCursor, pageSize)
        const response = await this.#makeSyncResponseWithDatas(dataType, logs)
        if(logs.length < pageSize) {
            const serverTimestamp = await this.synctimeRepository.syncTimestamp(userId, dataType)
            response.setNextPageCursor(null)
            response.setSynctime(serverTimestamp.timestamp)
        }
        return response
    }

    async #updateServerTimestamp(userId, dataType) {
        const timestamp = new SyncTimeStamp(
            userId, dataType, parseInt(Date.now(), 10)
        )
        await this.synctimeRepository.updateTimestamp(timestamp)
    }

    async #makeSyncResponseWithDatas(dataType, logs) {
        const createdLogs = logs.filter(log => { return log.changeCase === ChangeLogs.DataChangeCase.CREATED })
        const createds = await this.#loadChangedDatas(dataType, createdLogs)
        const updatedLogs = logs.filter(log => { return log.changeCase === ChangeLogs.DataChangeCase.UPDATED })
        const updateds = await this.#loadChangedDatas(dataType, updatedLogs)
        const deletedIds = logs
            .filter(log => { return log.changeCase === ChangeLogs.DataChangeCase.DELETED })
            .map(log => { return log.uuid })

        const response = new Response()
        response.setCreated(createds)
        response.setUpdated(updateds)
        response.setDeleted(deletedIds)

        if(logs.length > 0) {
            // 페이징 중이면 현재 page의 마지막 요소 uuid를 next page cursor로 제공
            const lastLog = logs[logs.length - 1]
            response.setNextPageCursor(lastLog.uuid)
        }
        return response
    }

    async #loadChangedDatas(dataType, logs) {
        const uuids = logs.map(log => { return log.uuid })
        const idsChunks = chunk(uuids, 30)
        if(uuids.length == 0) {
            return []
        } else if(dataType == DataTypes.EventTag) {
            const tags = idsChunks.map(ids => { return this.eventTagRepository.findTags(ids) })
            return (await Promise.all(tags)).flat();

        } else if(dataType === DataTypes.Todo) {
            const todos = idsChunks.map(ids => { return this.todoRepository.findTodos(ids) })
            return (await Promise.all(todos)).flat();
        } else if(dataType === DataTypes.Schedule) {
            const schedules = idsChunks.map(ids => { return this.scheduleRepository.findEvents(ids) })
            return (await Promise.all(schedules)).flat();
        } else {
            return []
        }
    }
}


module.exports = DataSyncService;