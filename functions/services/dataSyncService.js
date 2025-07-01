
const ChangeLogs = require('../models/DataChangeLog');
const DataTypes = require('../models/DataTypes');
const SyncTimeStamp = require('../models/SyncTimestamp');
const SyncResponse = require('../models/SyncResponse')
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

    async sync(userId, dataType, clientTimestamp) {
        const serverTimestamp = await this.synctimeRepository.syncTimestamp(userId, dataType);
        if(!serverTimestamp || !clientTimestamp) {
            return this.#syncAllData(userId, dataType)

        } else if(clientTimestamp.timestamp === serverTimestamp.timestamp) {
            return SyncResponse.Response.noNeedToSync

        } else if(clientTimestamp.timestamp > serverTimestamp.timestamp) {
            return SyncResponse.Response.noNeedToSync
            
        }  else {
            return this.#syncUpdatedData(userId, dataType, clientTimestamp, serverTimestamp)
        }
    }

    async #syncAllData(userId, dataType) {

        const allDatas = await this.#loadAllDatas(dataType, userId)

        const timestamp = new SyncTimeStamp(
            userId, dataType, parseInt(Date.now(), 10)
        )
        await this.synctimeRepository.updateTimestamp(timestamp);

        const response = new SyncResponse.Response(SyncResponse.CheckResult.migrationNeeds)
            .setUpdated(allDatas)
            .setSynctime(timestamp)

        return response
    }

    async #syncUpdatedData(userId, dataType, clientTimestamp, serverTimestamp) {

        const logs = await this.changeLogRepository.findChanges(userId, dataType, clientTimestamp.timestamp);
        const createdLogs = logs.filter(log => { return log.changeCase === ChangeLogs.DataChangeCase.CREATED })
        const createds = await this.#loadChangedDatas(dataType, createdLogs)
        const updatedLogs = logs.filter(log => { return log.changeCase === ChangeLogs.DataChangeCase.UPDATED })
        const updateds = await this.#loadChangedDatas(dataType, updatedLogs)
        const deletedIds = logs
            .filter(log => { return log.changeCase === ChangeLogs.DataChangeCase.DELETED })
            .map(log => { return log.uuid })

        const response = new SyncResponse.Response(SyncResponse.CheckResult.needToSync)
            .setCreated(createds)
            .setUpdated(updateds)
            .setDeleted(deletedIds)
            .setSynctime(serverTimestamp)

        return response
    }

    async #loadAllDatas(dataType, userId) {
        if(dataType === DataTypes.EventTag) {
            return await this.eventTagRepository.findAllTags(userId);
        } else if(dataType === DataTypes.Todo) {
            return await this.todoRepository.getAllTodos(userId);
        } else if(dataType === DataTypes.Schedule) {
            return await this.scheduleRepository.getAllEvents(userId);
        } else {
            return []
        }
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