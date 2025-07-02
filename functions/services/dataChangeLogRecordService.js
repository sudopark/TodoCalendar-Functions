
const SyncTimestamp = require('../models/SyncTimestamp');

class DataChangeLogRecordService {

    constructor(syncTimeRepository, changeLogRepository) {
        this.syncTimeRepository = syncTimeRepository
        this.changeLogRepository = changeLogRepository
    }

    async record(dataType, log) {
        try {
            await this.changeLogRepository.updateLog(log, dataType)
            
            const serverTimestamp = await this.syncTimeRepository.syncTimestamp(log.userId, dataType)
            if(serverTimestamp && serverTimestamp.timestamp > log.timestamp) {
                return
            }

            const newSyncTime = new SyncTimestamp(log.userId, dataType, log.timestamp)
            await this.syncTimeRepository.updateTimestamp(newSyncTime)

        } catch (error) { }
    }
}

module.exports = DataChangeLogRecordService;