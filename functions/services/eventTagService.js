
const { chunk } = require('../Utils/functions');
const ChangeLog = require('../models/DataChangeLog');
const DataType = require('../models/DataTypes');

class EventTagService {

    constructor(eventTagRepository, changeLogRecordService) {
        this.eventTagRepository = eventTagRepository
        this.changeLogRecordService = changeLogRecordService
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
        const newTag = await this.eventTagRepository.makeTag(payload)
        const log = new ChangeLog.DataChangeLog(
            newTag.uuid, payload.userId, ChangeLog.DataChangeCase.CREATED, parseInt(Date.now(), 10)
        )
        await this.changeLogRecordService.record(DataType.EventTag, log)
        return newTag
    }

    async putTag(tagId, payload, skipCheckDuplicationName) {
        
        if(!skipCheckDuplicationName) {
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
        }
        const updated = await this.eventTagRepository.updateTag(tagId, payload)
        const log = new ChangeLog.DataChangeLog(
            updated.uuid, payload.userId, ChangeLog.DataChangeCase.UPDATED, parseInt(Date.now(), 10)
        )
        await this.changeLogRecordService.record(DataType.EventTag, log);
        return updated
    }

    async removeTag(userId, tagId) {
        await this.eventTagRepository.removeTag(tagId);
        const log = new ChangeLog.DataChangeLog(
            tagId, userId, ChangeLog.DataChangeCase.DELETED, parseInt(Date.now(), 10)
        )
        await this.changeLogRecordService.record(DataType.EventTag, log)
    }

    async findAllTags(userId) {
        return await this.eventTagRepository.findAllTags(userId);
    }

    async findTags(ids) {
        let idSlices;
        if(Array.isArray(ids)) {
            idSlices = chunk(ids, 30)
        } else {
            idSlices = [[ids]]
        }
        const loadings = idSlices.map(slice => {
            return this.eventTagRepository.findTags(slice)
        })
        return (await Promise.all(loadings)).flat();
    }
}

module.exports = EventTagService;