
const Errors = require('../models/Errors');

class AppSetingController {

    constructor(appSettingService) {
        this.appSettingService = appSettingService
    }

    async getUserDefaultEventTagColors(req, res)  {
        const userId = req.auth.uid;
        if(!userId) {
            throw new Errors.BadRequest('user id is missing.')
        }

        try {
            const colors = await this.appSettingService.userDefaultEventTagColors(userId);
            res.status(200)
                .send(colors)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async patchUserDefaultEventTagColors(req, res) {
        const body  = req.body, userId = req.auth.uid;
        if(!userId || (!body.holiday && !body.default)) {
            throw new Errors.BadRequest('user id, holiday or default tag color is missing.')
        }

        const payload = {
            holiday: body.holiday, default: body.default
        }
        try {
            const colors = await this.appSettingService.updateUserDefaultEventTagColors(userId, payload);
            res.status(201)
                .send(colors)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = AppSetingController;