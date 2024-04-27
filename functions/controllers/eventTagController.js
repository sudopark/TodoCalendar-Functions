
const Errors = require('../models/Errors');

class EventTagController {

    constructor(eventTagService) {
        this.eventTagService = eventTagService
    }

    async postEventTag(req, res) {
        const { body } = req, userId = req.auth.uid;

        if(
            !userId || !body.name
        ) {
            throw new Errors.BadRequest('user id or tag name is missing.')
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
            throw new Errors.Application(error)
        }
    }

    async putEventTag(req, res) {
        const { body } = req, tagId = req.params.id, userId = req.auth.userId;
        if(
            !tagId || !body.name || !userId
        ) {
            throw new Errors.BadRequest('tag id, user id or tag name is missing.')
        }

        const payload = {
            name: body.name, 
            color_hex: body.color_hex, 
            userId: userId
        }
        try {
            const tag = await this.eventTagService.putTag(tagId, payload)
            res.status(201)
                .send(tag)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async deleteTag(req, res) {
        const tagId = req.params.id;
        if(
            !tagId
        ) {
            throw new Errors.BadRequest('tag id is missing.')
        }

        try {
            await this.eventTagService.removeTag(tagId)
            res.status(200)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async getAllTags(req, res) {
        const userId = req.auth.uid
        if(
            !userId
        ) {
            throw new Errors.BadRequest('user id is missing.')
        }

        try {
            const tags = await this.eventTagService.findAllTags(userId)
            res.status(200)
                .send(tags)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async getTags(req, res) {
        const ids = req.query.ids;
        if(
            !ids
        ) {
            throw new Errors.BadRequest('user id is missing.')
        }

        try {
            const tags = await this.eventTagService.findTags(ids)
            res.status(200)
                .send(tags)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = EventTagController;
