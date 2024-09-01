const Errors = require("../models/Errors");
const { chunk } = require("../Utils/functions")

class ScheduleEventService {

    constructor(scheduleEventRepository, eventTimeRangeService) {
        this.scheduleEventRepository = scheduleEventRepository
        this.eventTimeRangeService = eventTimeRangeService
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
        return newEvent;
    }

    async putEvent(userId, eventId, payload) {
        const updated = await this.scheduleEventRepository.putEvent(eventId, payload);
        await this.#updateEventtime(userId, updated);
        return updated;
    }

    async updateEvent(userId, eventId, payload) {
        const updated = await this.scheduleEventRepository.updateEvent(eventId, payload)
        await this.#updateEventtime(userId, updated);
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
        return { updated_origin: updated, new_schedule: newEvent }
    }

    async excludeRepeating(eventId, excludeTime) {
        const origin = await this.scheduleEventRepository.findEvent(eventId);
        let newExcludeTimes = [...(origin.exclude_repeatings ?? [])]
        newExcludeTimes.push(excludeTime);

        const updated = await this.scheduleEventRepository.updateEvent(
            eventId, { exclude_repeatings: newExcludeTimes }
        )
        return updated
    }

    async branchNewRepeatingEvent(userId, originEventId, endTime, newPayload) {
        const origin = await this.scheduleEventRepository.findEvent(originEventId);
        if (!origin.repeating) {
            throw new Errors.Application({status: 400, message: 'origin event not repeating'});
        }
        const updated = await this.scheduleEventRepository.updateEvent(
            originEventId, { repeating: {...origin.repeating, end: endTime} }
        )
        await this.#updateEventtime(userId, updated);
        const newEvent = await this.scheduleEventRepository.makeEvent(newPayload);
        await this.#updateEventtime(userId, newEvent);
        
        return { new: newEvent, origin: updated }
    }

    async removeEvent(eventId) {
        await this.scheduleEventRepository.removeEvent(eventId);
        await this.eventTimeRangeService.removeEventTime(eventId);
    }

    async #updateEventtime(userId, event) {
        const payload = this.eventTimeRangeService.scheduleTimeRange(userId, event);
        await this.eventTimeRangeService.updateEventTime(event.uuid, payload);
    }
}

module.exports = ScheduleEventService;