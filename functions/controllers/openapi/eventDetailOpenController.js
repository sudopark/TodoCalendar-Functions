
const Errors = require('../../models/Errors');

class EventDetailOpenController {

    constructor(eventDetailDataService) {
        this.eventDetailDataService = eventDetailDataService;
    }

    async putData(req, res) {
        const eventId = req.params.id;
        const isDoneDetail = req.isDoneDetail === true;
        const { body } = req;
        if (!eventId) {
            throw new Errors.BadRequest('event id is missing.');
        }
        const payload = {
            place: body.place,
            url: body.url,
            memo: body.memo
        };
        try {
            const data = await this.eventDetailDataService.putData(eventId, payload, isDoneDetail);
            res.status(201).send(data);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async getData(req, res) {
        const eventId = req.params.id;
        const isDoneDetail = req.isDoneDetail === true;
        if (!eventId) {
            throw new Errors.BadRequest('event id is missing.');
        }
        try {
            const data = await this.eventDetailDataService.findData(eventId, isDoneDetail);
            res.status(200).send(data);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async deleteData(req, res) {
        const eventId = req.params.id;
        const isDoneDetail = req.isDoneDetail === true;
        if (!eventId) {
            throw new Errors.BadRequest('event id is missing.');
        }
        try {
            await this.eventDetailDataService.removeData(eventId, isDoneDetail);
            res.status(200).send({ status: 'ok' });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = EventDetailOpenController;
