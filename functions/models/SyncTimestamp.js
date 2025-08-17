
class SyncTimeStamp {

    constructor(userId, dataType, timestamp) {
        this.userId = userId
        this.dataType = dataType
        this.timestamp = timestamp
    }

    static fromData(data) {
        return new SyncTimeStamp(data.userId, data.dataType, data.timestamp)
    }

    toJSON() {
        return {
            userId: this.userId, 
            dataType: this.dataType, 
            timestamp: this.timestamp
        }
    }
}

module.exports = SyncTimeStamp;