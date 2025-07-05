

class SpyChangeLogRecordService {

    constructor() {
        this.logMap = new Map();
    }

    async record(dataType, log) {
        const logs = (this.logMap.get(dataType) ?? [])
        logs.push(log)
        this.logMap.set(dataType, logs)
    }

    async recordLogs(dataType, logs)  {
        this.logMap.set(dataType, logs)
    }
}

module.exports = SpyChangeLogRecordService;