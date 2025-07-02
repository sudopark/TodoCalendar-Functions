
const Errors = require('../models/Errors');
const DataType = require('../models/DataTypes')
const SyncTimestamp = require('../models/SyncTimestamp')

class DataSyncController {

    constructor(dataSyncService) {
        this.dataSyncService = dataSyncService
    }

    async sync(req, res) {
        const userId = req.auth.uid, dataType = req.params.dataType, timestampText = req.params.timestamp
        if(!userId || !dataType || !timestampText) {
            throw new Errors.BadRequest('userId, dataType or timestamp is missing.')
        }
        if(dataType !== DataType.EventTag && dataType !== DataType.Todo && dataType !== DataType.Schedule ) {
            throw new Errors.BadRequest(`not support data type: ${dataType}`)
        }
        const timestampValue = Number.parseInt(timestampText, 10)
        if(isNaN(timestampValue)) {
            throw new Errors.BadRequest(`invalid timestamp value: ${timestampText}`)
        }

        const timestamp = new SyncTimestamp(
            userId, dataType, parseInt(timestampText, 10)
        )
        try {
            const responseModel = await this.dataSyncService.sync(userId, dataType, timestamp)
            const resposeJSON = JSON.stringify(responseModel)
            res.status(200)
                .send(resposeJSON)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async syncAll(req, res) {
        const userId = req.auth.uid, dataType = req.params.dataType;
        if(!userId || !dataType) {
            throw new Errors.BadRequest('userId, dataType or timestamp is missing.')
        }

        try {
            const responseModel = await this.dataSyncService.syncAll(userId, dataType);
            const responseJSON = JSON.stringify(responseModel);
            res.status(200)
                .send(responseJSON)

        } catch (error) {
            throw new Errors.Application(error)
        }
    } 
}

module.exports = DataSyncController;