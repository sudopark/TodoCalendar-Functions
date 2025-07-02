
const SyncTimestamp = require('../models/SyncTimestamp');

class DataChangeLogRecordService {

    constructor(syncTimeRepository, changeLogRepository) {
        this.syncTimeRepository = syncTimeRepository
        this.changeLogRepository = changeLogRepository
    }

    async record(dataType, log) {
        try {
            await this.changeLogRepository.updateLog(log, dataType)
            
            const syncTime = new SyncTimestamp(log.userId, dataType, log.timestamp)
            await this.syncTimeRepository.updateTimestamp(syncTime)
        } catch (error) { }
    }
}

module.exports = DataChangeLogRecordService;