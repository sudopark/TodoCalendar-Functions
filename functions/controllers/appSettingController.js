

class AppSetingController {

    constructor(appSettingService) {
        this.appSettingService = appSettingService
    }

    async getUserDefaultEventTagColors(req, res)  {
        const userId = req.auth.uid;
        if(!userId) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id is missing." 
                })
            return
        }

        try {
            const colors = await this.appSettingService.userDefaultEventTagColors(userId);
            res.status(200)
                .send(colors)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async patchUserDefaultEventTagColors(req, res) {
        const { body } = req.body, userId = req.auth.uid;
        if(!userId || !body.holiday || !body.default) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id, holiday or default tag color is missing." 
                })
            return
        }

        const payload = {
            holiday: body.holiday, default: body.default
        }
        try {
            const colors = await this.appSettingService.updateUserDefaultEventTagColors(userId, payload);
            res.status(201)
                .send(colors)
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

module.exports = AppSetingController;