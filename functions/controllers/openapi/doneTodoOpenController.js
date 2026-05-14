
const Errors = require('../../models/Errors');

class DoneTodoOpenController {

    constructor(doneTodoService) {
        this.doneTodoService = doneTodoService;
    }

    async getDoneTodos(req, res) {
        const userId = req.openUserId;
        const size = parseInt(req.query.size);
        const cursor = parseFloat(req.query.cursor);
        if (!userId || !size) {
            throw new Errors.BadRequest('user id or size is missing.');
        }
        try {
            const page = await this.doneTodoService.loadDoneTodos(userId, size, cursor);
            res.status(200).send(page);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async getDoneTodo(req, res) {
        const doneEventId = req.params.id;
        if (!doneEventId) {
            throw new Errors.BadRequest('done todo id is missing.');
        }
        try {
            const done = await this.doneTodoService.loadDoneTodo(doneEventId);
            res.status(200).send(done);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async putDoneTodo(req, res) {
        const userId = req.openUserId;
        const doneEventId = req.params.id;
        const { body } = req;
        if (!userId || !doneEventId) {
            throw new Errors.BadRequest('user id or doneEventId is missing.');
        }
        try {
            const done = await this.doneTodoService.putDoneTodo(userId, doneEventId, body);
            res.status(200).send(done);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async deleteDoneTodo(req, res) {
        const userId = req.openUserId;
        const doneEventId = req.params.id;
        if (!userId || !doneEventId) {
            throw new Errors.BadRequest('user id or doneEventId is missing.');
        }
        try {
            await this.doneTodoService.removeDoneTodo(doneEventId);
            res.status(200).send({ status: 'ok' });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async revertDoneTodo(req, res) {
        const userId = req.openUserId;
        const doneEventId = req.params.id;
        if (!userId || !doneEventId) {
            throw new Errors.BadRequest('user id or doneEventId is missing.');
        }
        try {
            const result = await this.doneTodoService.revertDoneTodoV2(userId, doneEventId);
            res.status(201).send(result);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = DoneTodoOpenController;
