

class SpyChangeLogRecordService {

    constructor() {
        this.logMap = new Map();
    }

    async record(dataType, log) {
        this.logMap.set(dataType, log)
    }

    async recordLogs(dataType, logs)  {
        this.logMap.set(dataType, logs)
    }
}

module.exports = SpyChangeLogRecordService;