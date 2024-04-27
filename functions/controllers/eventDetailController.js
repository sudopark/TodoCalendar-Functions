
const Errors = require('../models/Errors');

class EventDetailDataController {
 
    constructor(eventdetailDataService) {
        this.eventdetailDataService = eventdetailDataService
    }

    async putData(req, res) {
        const { body } = req, eventid = req.params.id;
        if(!eventid) {
            throw new Errors.BadRequest('event id is missing.')
        }

        const payload = {
            place: body.place, 
            url: body.url, 
            memo: body.memo
        }

        try {
            const newData = await this.eventdetailDataService.putData(eventid, payload)
            res.status(201)
                .send(newData)
        } catch(error) {
            throw new Errors.Application(error)
        }
    }

    async getData(req, res) {
        const eventid = req.params.id;
        if(!eventid) {
            throw new Errors.BadRequest('event id is missing.')
        }

        try {
            const data = await this.eventdetailDataService.findData(eventid)
            res.status(200)
                .send(data)

        } catch(error) {
            throw new Errors.Application(error)
        }
    }

    async deleteData(req, res) {
        const eventid = req.params.id;
        if(!eventid) {
            if(!eventid) {
                throw new Errors.BadRequest('event id is missing.')
            }
        }
        try {
            await this.eventdetailDataService.removeData(eventid)
            res.status(200)
                .send({ status: 'ok' })

        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = EventDetailDataController;