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