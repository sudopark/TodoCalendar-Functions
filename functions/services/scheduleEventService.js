const { chunk } = require("../Utils/functions")

class ScheduleEventService {

    constructor(scheduleEventRepository, eventTimeRangeService) {
        this.scheduleEventRepository = scheduleEventRepository
        this.eventTimeRangeService = eventTimeRangeService
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