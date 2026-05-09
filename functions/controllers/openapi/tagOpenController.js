
const Errors = require('../../models/Errors');

class TagOpenController {

    constructor(eventTagService) {
        this.eventTagService = eventTagService;
    }

    async getAllTags(req, res) {
        const userId = req.openUserId;
        if (!userId) {
            throw new Errors.BadRequest('user id is missing.');
        }
        try {
            const tags = await this.eventTagService.findAllTags(userId);
            res.status(200).send(tags);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async postEventTag(req, res) {
        const { body } = req;
        const userId = req.openUserId;
        if (!userId || !body.name) {
            throw new Errors.BadRequest('user id or tag name is missing.');
        }
        const payload = {
            name: body.name,
            userId,
            color_hex: body.color_hex
        };
        try {
            const tag = await this.eventTagService.makeTag(payload);
            res.status(201).send(tag);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async putEventTag(req, res) {
        const { body } = req;
        const tagId = req.params.id;
        const userId = req.openUserId;
        if (!tagId || !body.name || !userId) {
            throw new Errors.BadRequest('tag id, user id or tag name is missing.');
        }
        const payload = {
            name: body.name,
            color_hex: body.color_hex,
            userId
        };
        try {
            const tag = await this.eventTagService.putTag(tagId, payload, body.skipCheckDuplicationName);
            res.status(201).send(tag);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async deleteTag(req, res) {
        const tagId = req.params.id;
        const userId = req.openUserId;
        if (!tagId || !userId) {
            throw new Errors.BadRequest('tag id or userId is missing.');
        }
        try {
            await this.eventTagService.removeTag(userId, tagId);
            res.status(200).send({ status: 'ok' });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = TagOpenController;
