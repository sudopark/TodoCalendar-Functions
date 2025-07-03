

class SpyChangeLogRecordService {

    constructor() {
        this.logMap = new Map();
    }

    async record(dataType, log) {
        this.logMap.set(dataType, log)
    }
}

module.exports = SpyChangeLogRecordService;