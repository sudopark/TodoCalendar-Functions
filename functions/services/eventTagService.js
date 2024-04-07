
const { chunk } = require('../Utils/functions');

class EventTagService {

    constructor(eventTagRepository) {
        this.eventTagRepository = eventTagRepository
    }

    async makeTag(payload) {
        const sameNameTags = await this.eventTagRepository
            .findTagByName(payload.name, payload.userId);
        if(sameNameTags.length) {
            throw { 
                status: 400, code: 'DuplicatedName',
                message: `same name: ${payload.name} tag already exists`
            };
        }
        return this.eventTagRepository.makeTag(payload)
    }

    async putTag(tagId, payload) {
        const sameNameTags = await this.eventTagRepository
            .findTagByName(payload.name, payload.userId)
        const sameNameTagsExcludeThisEvent = sameNameTags
            .filter(tag => tag.uuid != tagId)
        if(sameNameTagsExcludeThisEvent.length) {
            throw { 
                status: 400, code: 'DuplicatedName',
                message: `same name: ${payload.name} tag already exists`
            };
        }
        return this.eventTagRepository.updateTag(tagId, payload)
    }

    async removeTag(tagId) {
        return this.eventTagRepository.removeTag(tagId);
    }

    async findAllTags(userId) {
        return await this.eventTagRepository.findAllTags(userId);
    }

    async findTags(ids) {
        const idSlices = chunk(ids, 30)
        const loadings = idSlices.map(slice => {
            return this.eventTagRepository.findTags(slice)
        })
        return (await Promise.all(loadings)).flat();
    }
}

module.exports = EventTagService;