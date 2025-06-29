

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

    constructor(data) {
        this.uuid = data.uuid
        this.userId = data.userId
        this.changeCase = new DataChangeCase(data.changeCase)
        this.timestamp = data.timestamp
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