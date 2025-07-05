const { DataChangeLog, DataChangeCase } = require("../models/DataChangeLog");
const DataTypes = require("../models/DataTypes");
const Errors = require("../models/Errors");
const { chunk } = require("../Utils/functions")

class ScheduleEventService {

    constructor(scheduleEventRepository, eventTimeRangeService, changeLogRecordService) {
        this.scheduleEventRepository = scheduleEventRepository
        this.eventTimeRangeService = eventTimeRangeService
        this.changeLogRecordService = changeLogRecordService
    }

    async getEvent(eventId) {
        const event = await this.scheduleEventRepository.findEvent(eventId);
        return event
    }

    async findEvents(userId, lower, upper) {
        const eventIds = await this.eventTimeRangeService.eventIds(userId, false, lower, upper);
        const eventIdSlices = chunk(eventIds, 30)
        const loadEvents = eventIdSlices.map((ids) => {
            return this.scheduleEventRepository.findEvents(ids)
        })
        return (await Promise.all(loadEvents)).flat();
    }

    async makeEvent(userId, payload) {
        const newEvent = await this.scheduleEventRepository.makeEvent(payload);
        await this.#updateEventtime(userId, newEvent);
        await this.#updateLog(userId, newEvent.uuid, DataChangeCase.CREATED)
        return newEvent;
    }

    async putEvent(userId, eventId, payload) {
        const updated = await this.scheduleEventRepository.putEvent(eventId, payload);
        await this.#updateEventtime(userId, updated);
        await this.#updateLog(userId, updated.uuid, DataChangeCase.UPDATED)
        return updated;
    }

    async updateEvent(userId, eventId, payload) {
        const updated = await this.scheduleEventRepository.updateEvent(eventId, payload)
        await this.#updateEventtime(userId, updated);
        await this.#updateLog(userId, updated.uuid, DataChangeCase.UPDATED)
        return updated
    }

    async makeNewEventWithExcludeFromRepeating(userId, eventId, excludeTime, newPayload) {
        const origin = await this.scheduleEventRepository.findEvent(eventId);

        let newExcludeTimes = [...(origin.exclude_repeatings ?? [])]
        newExcludeTimes.push(excludeTime);

        const updated = await this.scheduleEventRepository.updateEvent(
            eventId, { exclude_repeatings: newExcludeTimes }
        )
        const newEvent = await this.scheduleEventRepository.makeEvent(newPayload);
        await this.#updateEventtime(userId, newEvent);
        await this.#updateLog(userId, updated.uuid, DataChangeCase.UPDATED)
        await this.#updateLog(userId, newEvent.uuid, DataChangeCase.CREATED)

        return { updated_origin: updated, new_schedule: newEvent }
    }

    async excludeRepeating(eventId, excludeTime) {
        const origin = await this.scheduleEventRepository.findEvent(eventId);
        let newExcludeTimes = [...(origin.exclude_repeatings ?? [])]
        newExcludeTimes.push(excludeTime);

        const updated = await this.scheduleEventRepository.updateEvent(
            eventId, { exclude_repeatings: newExcludeTimes }
        )

        await this.#updateLog(updated.userId, eventId, DataChangeCase.UPDATED)    
        return updated
    }

    async branchNewRepeatingEvent(userId, originEventId, endTime, newPayload) {
        const origin = await this.scheduleEventRepository.findEvent(originEventId);
        if (!origin.repeating) {
            throw new Errors.Application({status: 400, message: 'origin event not repeating'});
        }
        origin.repeating.end = endTime
        delete origin.repeating.end_count
        const updated = await this.scheduleEventRepository.putEvent(
            originEventId, origin
        )
        await this.#updateEventtime(userId, updated);
        const newEvent = await this.scheduleEventRepository.makeEvent(newPayload);
        await this.#updateEventtime(userId, newEvent);

        await this.#updateLog(userId, newEvent.uuid, DataChangeCase.CREATED)
        await this.#updateLog(userId, updated.uuid, DataChangeCase.UPDATED)
        
        return { new: newEvent, origin: updated }
    }

    async removeEvent(userId, eventId) {
        await this.scheduleEventRepository.removeEvent(eventId);
        await this.eventTimeRangeService.removeEventTime(eventId);
        await this.#updateLog(userId, eventId, DataChangeCase.DELETED)
    }

    async removeAllEventsWithTagId(userId, tagId) {
        const ids = await this.scheduleEventRepository.removeAllEventWithTagId(tagId)
        await this.eventTimeRangeService.removeEventTimes(ids)

        const logs = ids.map(id => {
            return new DataChangeLog(id, userId, DataChangeCase.DELETED, parseInt(Date.now(), 10))
        })
        await this.changeLogRecordService.recordLogs(DataTypes.Schedule, logs)
        return ids
    }

    async #updateEventtime(userId, event) {
        const payload = this.eventTimeRangeService.scheduleTimeRange(userId, event);
        await this.eventTimeRangeService.updateEventTime(event.uuid, payload);
    }

    async #updateLog(userId, eventId, changeCase) {
        const log = new DataChangeLog(eventId, userId, changeCase, parseInt(Date.now(), 10))
        await this.changeLogRecordService.record(DataTypes.Schedule, log)
    }
}

module.exports = ScheduleEventService;