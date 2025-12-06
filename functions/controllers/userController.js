
const Errors = require('../models/Errors');

class UserController {

    constructor(userService) {
        this.userService = userService
    }

    async updateNotificationToken(req, res) {
        
        const userId = req.auth.uid; const deviceId = req.header('device_id')
        const token = req.body.fcm_token; const model = req.body.device_model

        if( !userId || !deviceId || !token ) {
            throw new Errors.BadRequest('user id, device id or fcm token is missing.');
        }

        try {
            await this.userService.updateUserDevice(deviceId, userId, token, model);
            res.status(201)
                .send({status: 'ok'})
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async removeNotificationToken(req, res) {
        const userId = req.auth.uid; const deviceId = req.header('device_id')
        if( !userId || !deviceId ) {
            throw new Errors.BadRequest('user id or device id is missing.');
        }

        try {
            await this.userService.removeUserDevice(deviceId)
            res.status(200)
                .send({status: 'ok'})

        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = UserController;