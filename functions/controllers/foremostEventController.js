
const Errors = require('../models/Errors');


class ForemostEventController {

    constructor(foremostEventService) {
        this.foremostEventService = foremostEventService
    }


    async getForemostEvent(req, res) {
        const userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }

        try {
            const event = await this.foremostEventService.getForemostEvent(userId);
            res.status(200)
                .send(event)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async updateForemostEvent(req, res) {
        const userId = req.auth.uid; const foremostId = req.body;
        if(!userId || !foremostId || foremostId.is_todo == null) {
            throw new Errors.BadRequest('user id or foremostId is missing.')
        }
        const payload = {
            event_id: foremostId.event_id, 
            is_todo: JSON.parse(foremostId.is_todo)
        }
        try {
            const event = await this.foremostEventService.updateForemostEvent(userId, payload);
            res.status(201)
                .send(event)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async removeForemostEvent(req, res) {
        const userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }
        try {
            await this.foremostEventService.removeForemostEvent(userId);
            res.status(200)
            .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = ForemostEventController;