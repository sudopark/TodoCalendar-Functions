

class EventTagController {

    constructor(eventTagService) {
        this.eventTagService = eventTagService
    }

    async postEventTag(req, res) {
        const { body } = req, userId = req.auth.uid;

        if(
            !userId || !body.name
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id or tag name is missing." 
                })
            return;
        }

        const payload = {
            name: body.name, 
            userId: userId, 
            color_hex: body.color_hex
        }
        try {
            const tag = await this.eventTagService.makeTag(payload)
            res.status(201)
                .send(tag)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async putEventTag(req, res) {
        const { body } = req, tagId = req.params.id;
        if(
            !tagId || !body.name
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "tag id or tag name is missing." 
                })
            return;
        }

        const payload = {
            name: body.name, 
            color_hex: body.color_hex
        }
        try {
            const tag = await this.eventTagService.putTag(tagId, payload)
            res.status(201)
                .send(tag)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async deleteTag(req, res) {
        const tagId = req.params.id;
        if(
            !tagId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "tag id is missing." 
                })
            return
        }

        try {
            await this.eventTagService.removeTag(tagId)
            res.status(200)
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

    async getAllTags(req, res) {
        const userId = req.auth.uid
        if(
            !userId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id is missing." 
                })
            return
        }

        try {
            const tags = await this.eventTagService.findAllTags(userId)
            res.status(200)
                .send(tags)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async getTags(req, res) {
        const ids = req.query.ids;
        if(
            !ids
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id is missing." 
                })
            return
        }

        try {
            const tags = await this.eventTagService.findTags(ids)
            res.status(200)
                .send(tags)
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

module.exports = EventTagController;
