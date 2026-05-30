
const Errors = require('../../models/Errors');

class ForemostOpenController {

    constructor(foremostEventService) {
        this.foremostEventService = foremostEventService;
    }

    async getForemostEvent(req, res) {
        const userId = req.openUserId;
        if (!userId) {
            throw new Errors.BadRequest('user id is missing.');
        }
        try {
            const event = await this.foremostEventService.getForemostEvent(userId);
            res.status(200).send(event);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async updateForemostEvent(req, res) {
        const userId = req.openUserId;
        const { event_id, is_todo } = req.body ?? {};
        if (!userId || !event_id || is_todo == null) {
            throw new Errors.BadRequest('user id, event_id or is_todo is missing.');
        }
        try {
            const event = await this.foremostEventService.updateForemostEvent(userId, { event_id, is_todo });
            res.status(201).send(event);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async removeForemostEvent(req, res) {
        const userId = req.openUserId;
        if (!userId) {
            throw new Errors.BadRequest('user id is missing.');
        }
        try {
            await this.foremostEventService.removeForemostEvent(userId);
            res.status(200).send({ status: 'ok' });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = ForemostOpenController;
