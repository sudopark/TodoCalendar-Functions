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

    async excludeRepeatingEventTime(userId, eventId, excludeTime, newPayload) {
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

    async removeEvent(eventId) {
        await this.scheduleEventRepository.removeEvent(eventId);
        await this.eventTimeRangeService.removeEventTime(eventId);
    }

    async #updateEventtime(userId, event) {
        await this.eventTimeRangeService.updateEventTime(
            userId,
            false,
            event.uuid, 
            event.event_time, 
            event.repeating
        )
    }
}

module.exports = ScheduleEventService;