

class EventDetailDataService {

    constructor(eventDetailDataRepository) {
        this.eventDetailDataRepository = eventDetailDataRepository
    }

    async putData(eventId, payload) {
        return this.eventDetailDataRepository.putData(eventId, payload);
    }

    async findData(eventId) {
        try {
            const data = await this.eventDetailDataRepository.findData(eventId)
            return data
        } catch (error) {
            if(error.code == "EventDetailNotExists") {
                return { eventId: eventId }
            }
            throw error
        }
    }

    async removeData(eventId) {
        return this.eventDetailDataRepository.removeData(eventId)
    }
}

module.exports = EventDetailDataService;