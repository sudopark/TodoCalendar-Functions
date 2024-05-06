

const Errors = require('../models/Errors');

class DoneTodoController {

    constructor(doneTodoService) {
        this.doneTodoService = doneTodoService
    }

    async getDoneTodos(req, res) {
        const userId = req.auth.uid
        const size = req.query.size ?? 100, cursor = req.query.cursor
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.');
        }

        try {
            const page = await this.doneTodoService.loadDoneTodos(userId, size, cursor)
            res.status(200)
                .send(page)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async deleteDoneTodos(req, res) {
        const userId = req.auth.uid;
        const pastThan = req.query.past_than

        if(!userId) {
            throw new Errors.BadRequest('user id is missing.');
        }

        try {
            await this.doneTodoService.removeDoneTodos(userId, pastThan)
            res.status(200)
                .send({status: 'ok'})
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async revertDoneTodo(req, res) {
        const userId = req.auth.uid;
        const doneEventId = req.params.id;

        if(!userId || !doneEventId) {
            throw new Errors.BadRequest('user id or event id is missing.');
        }

        try {
            const reverted = await this.doneTodoService.revertDoneTodo(userId, doneEventId)
            res.status(201)
                .send(reverted)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = DoneTodoController;