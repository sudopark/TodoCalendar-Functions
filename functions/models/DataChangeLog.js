

class DataChangeCase {
    constructor(key) {
        this.key = key
    }
}

DataChangeCase.CREATED = new DataChangeCase('created');
DataChangeCase.UPDATED = new DataChangeCase('updated');
DataChangeCase.DELETED = new DataChangeCase('deleted')
Object.freeze(DataChangeCase);


class DataChangeLog {

    constructor(data) {
        this.userId = data.userId
        this.changeCase = new DataChangeCase(data.changeCase)
        this.timestamp = data.timestamp
    }
}

module.exports = {
    DataChangeCase: DataChangeCase, 
    DataChangeLog: DataChangeLog
}