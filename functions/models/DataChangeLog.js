

class DataChangeCase {
    constructor(key) {
        this.key = key
    }
}

DataChangeCase.CREATED = new DataChangeCase('created');
DataChangeCase.UPDATED = new DataChangeCase('updated');
DataChangeCase.DELETED = new DataChangeCase('deleted')
Object.freeze(DataChangeCase);
Object.freeze(DataChangeCase.CREATED);
Object.freeze(DataChangeCase.UPDATED);
Object.freeze(DataChangeCase.DELETED);


class DataChangeLog {

    constructor(uuid, userId, changeCase, timestamp) {
        this.uuid = uuid
        this.userId = userId
        this.changeCase = changeCase
        this.timestamp = timestamp
    }

    static fromData(data) {
        return new DataChangeLog(
            data.uuid, 
            data.userId,
            new DataChangeCase(data.changeCase), 
            data.timestamp
        )
    }

    toJSON() {
        return {
            uuid: this.uuid, 
            userId: this.userId, 
            changeCase: this.changeCase.key, 
            timestamp: this.timestamp
        }
    }
}

module.exports = {
    DataChangeCase: DataChangeCase, 
    DataChangeLog: DataChangeLog
}