


class MigrationController {

    constructor(migrationService) {
        this.migrationService = migrationService
    }

    async postMigrationTags(req, res) {
        const { tags } = req, userId = req.auth.uid;
        if(!userId) {
            res.status(400)
                .send({ code: "InvalidParameter",  message: "user id is missing." })
            return;
        }
        
        try {
            for(const id in tags) {
                tags[id].userId = userId
            }
            await this.migrationService.migrationEventTags(tags);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async postMigrationTodos(req, res) {
        const { todos } = req, userId = req.auth.uid;
        if(!userId) {
            res.status(400)
                .send({ code: "InvalidParameter",  message: "user id is missing." })
            return;
        }
        
        try {
            for(const id in todos) {
                todos[id].userId = userId
            }
            await this.migrationService.migrationTodos(userId, todos);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async postMigrationSchedules(req, res) {
        const { schedules } = req, userId = req.auth.uid;
        if(!userId) {
            res.status(400)
                .send({ code: "InvalidParameter",  message: "user id is missing." })
            return;
        }
        
        try {
            for(const id in schedules) {
                schedules[id].userId = userId
            }
            await this.migrationService.migrationSchedules(userId, schedules);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async postMigrationEventDetails(req, res) {
        const { details } = req
        
        try {
            await this.migrationService.migrationEventDetails(details);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }
}

module.exports = MigrationController;