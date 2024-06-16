

class ForemostEventService {


    constructor(
        foremostEventIdRepository, 
        toodRepository, 
        scheduleRepository
    ) {
        this.foremostEventIdRepository = foremostEventIdRepository
        this.toodRepository = toodRepository
        this.scheduleRepository = scheduleRepository
    }

    async getForemostEvent(userId) {
        const foremostId = await this.foremostEventIdRepository.foremostEventId(userId)
        return this.#getForemostEvent(foremostId)
    }

    async updateForemostEvent(userId, eventId) {
        const foremostId = await this.foremostEventIdRepository.updateForemostEventId(userId, eventId)
        return this.#getForemostEvent(foremostId)
    }

    async removeForemostEvent(userId) {
        return this.foremostEventIdRepository.removeForemostEventId(userId)
    }

    async #getForemostEvent(foremostId) {
        const eventId = foremostId?.event_id
        if(!eventId) {
            return null
        }
        
        let event;
        if(foremostId.is_todo) {
            event = await this.toodRepository.findTodo(eventId)
        } else {
            event = await this.scheduleRepository.findEvent(eventId)
        }
        return {
            ...foremostId, 
            event: {...event}
        }
    }
}

module.exports = ForemostEventService;