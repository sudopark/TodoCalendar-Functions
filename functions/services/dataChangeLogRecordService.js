
const SyncTimestamp = require('../models/SyncTimestamp');

class DataChangeLogRecordService {

    constructor(syncTimeRepository, changeLogRepository) {
        this.syncTimeRepository = syncTimeRepository
        this.changeLogRepository = changeLogRepository
    }

    async record(dataType, log) {
        try {
            await this.changeLogRepository.updateLog(log, dataType)
            
            await this.#updateServerTimestampIfNeed(log.userId, dataType, log.timestamp)

        } catch (error) { }
    }

    async recordLogs(dataType, logs) {

        if(logs.length == 0) {
            return
        }

        try {

            await this.changeLogRepository.updateLogs(logs, dataType)
            const latestLog = logs.reduce((max, log) => {
                if(max.timestamp < log.timestamp) {
                    return log
                } else {
                    return max
                }
            })

            await this.#updateServerTimestampIfNeed(latestLog.userId, dataType, latestLog.timestamp)

        } catch (error) { }
    }

    async #updateServerTimestampIfNeed(userId, dataType, timestamp) {
        const serverTimestamp = await this.syncTimeRepository.syncTimestamp(userId, dataType)
        if(serverTimestamp && serverTimestamp.timestamp > timestamp) {
            return
        }

        const newSyncTime = new SyncTimestamp(userId, dataType, timestamp)
        await this.syncTimeRepository.updateTimestamp(newSyncTime)
    }
}

module.exports = DataChangeLogRecordService;