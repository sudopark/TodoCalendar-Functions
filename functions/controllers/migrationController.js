

const Errors = require('../models/Errors');

class MigrationController {

    constructor(migrationService) {
        this.migrationService = migrationService
    }

    async postMigrationTags(req, res) {
        const tags = req.body, userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }
        
        try {
            for(const id in tags) {
                tags[id].userId = userId
            }
            await this.migrationService.migrationEventTags(tags);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async postMigrationTodos(req, res) {
        const todos = req.body, userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }
        
        try {
            for(const id in todos) {
                todos[id].userId = userId
            }
            await this.migrationService.migrationTodos(userId, todos);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async postMigrationSchedules(req, res) {
        const schedules = req.body, userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }
        
        try {
            for(const id in schedules) {
                schedules[id].userId = userId
            }
            await this.migrationService.migrationSchedules(userId, schedules);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async postMigrationEventDetails(req, res) {
        const details = req.body
        
        try {
            await this.migrationService.migrationEventDetails(details);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async postMigrationDoneTodoEvents(req, res) {
        const dones = req.body, userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }
        try {
            for(const id in dones) {
                dones[id].userId = userId
            }
            await this.migrationService.migrationDoneTodoEvents(dones);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = MigrationController;