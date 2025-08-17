
const Errors = require('../models/Errors');
const DataType = require('../models/DataTypes')
const SyncTimestamp = require('../models/SyncTimestamp')

class DataSyncController {

    constructor(dataSyncService) {
        this.dataSyncService = dataSyncService
    }

    async checkSync(req, res) {
        const userId = req.auth.uid, dataType = req.query.dataType, timestampText = req.query.timestamp
        if(!userId || !dataType) {
            throw new Errors.BadRequest('userId or dataType is missing.')
        }
        if(dataType !== DataType.EventTag && dataType !== DataType.Todo && dataType !== DataType.Schedule ) {
            throw new Errors.BadRequest(`not support data type: ${dataType}`)
        }
        const timestampValue = Number.parseInt(timestampText, 10)
        if(timestampText && isNaN(timestampValue)) {
            throw new Errors.BadRequest(`invalid timestamp value: ${timestampText}`)
        }

        try {
            const responseModel = await this.dataSyncService.checkSync(userId, dataType, timestampValue)
            const resposeJSON = JSON.stringify(responseModel)
            res.status(200)
                .send(resposeJSON)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async startSync(req, res) {
        const userId = req.auth.uid, dataType = req.query.dataType;
        const timestampText = req.query.timestamp, pageSizeText = req.query.size
        if(!userId || !dataType) {
            throw new Errors.BadRequest('userId or dataType is missing.')
        }

        if(dataType !== DataType.EventTag && dataType !== DataType.Todo && dataType !== DataType.Schedule ) {
            throw new Errors.BadRequest(`not support data type: ${dataType}`)
        }

        const timestampValue = Number.parseInt(timestampText, 10)
        if(timestampText && isNaN(timestampValue)) {
            throw new Errors.BadRequest(`invalid timestamp value: ${timestampText}`)
        }

        const pageSize = parseInt(pageSizeText, 10)
        if(isNaN(pageSize)) {
            throw new Errors.BadRequest(`invalid type of pageSize value: ${pageSizeText}`)
        }

        try {
            const responseModel = await this.dataSyncService.startSync(
                userId, dataType, timestampValue, pageSize
            )
            const resposeJSON = JSON.stringify(responseModel)
            res.status(200)
                .send(resposeJSON)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async continuteSync(req, res) {
        const userId = req.auth.uid, dataType = req.query.dataType;
        const cursor = req.query.cursor, pageSizetext = req.query.size

        if(!userId || !dataType || !cursor) {
            throw new Errors.BadRequest('userId, dataType or cursor is missing.')
        }

        if(dataType !== DataType.EventTag && dataType !== DataType.Todo && dataType !== DataType.Schedule ) {
            throw new Errors.BadRequest(`not support data type: ${dataType}`)
        }

        const pageSize = parseInt(pageSizetext, 10)
        if(isNaN(pageSize)) {
            throw new Errors.BadRequest(`invalid type of pageSize value: ${pageSizeText}`)
        }

        try {
            const responseModel = await this.dataSyncService.continueSync(
                userId, dataType, cursor, pageSize
            )
            const responseJSON = JSON.stringify(responseModel)
            res.status(200)
                .send(responseJSON)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = DataSyncController;