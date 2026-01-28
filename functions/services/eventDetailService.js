

class EventDetailDataService {

    constructor(eventDetailDataRepository, doneTodoDetailRepository) {
        this.eventDetailDataRepository = eventDetailDataRepository
        this.doneTodoDetailRepository = doneTodoDetailRepository
    }

    async putData(eventId, payload, isDoneDetail) {
        if(isDoneDetail) {
            return this.doneTodoDetailRepository.putData(eventId, payload);
        } else {
            return this.eventDetailDataRepository.putData(eventId, payload);
        }
    }

    async findData(eventId, isDoneDetail) {
        try {
            if(isDoneDetail) {
                const data = await this.doneTodoDetailRepository.findData(eventId)
                return data
            } else {
                const data = await this.eventDetailDataRepository.findData(eventId)
                return data
            }
        } catch (error) {
            if(error.code == "EventDetailNotExists") {
                return { eventId: eventId }
            }
            throw error
        }
    }

    async removeData(eventId, isDoneDetail) {
        if(isDoneDetail) {
            return this.doneTodoDetailRepository.removeData(eventId)
        } else {
            return this.eventDetailDataRepository.removeData(eventId)
        }
    }

    async copyTodoDetailToDoneTodoDetail(todoId, doneEventId) {
        try {
            // get todo detail
            const detail = await this.eventDetailDataRepository.findData(todoId);
            if(!detail) { return }

            // save done detail
            const { eventId, ...payload } = detail
            
            const doneDetail = await this.doneTodoDetailRepository.putData(doneEventId, payload)
            return doneDetail

        } catch (error) { }
    }

    async revertDoneTodoDetail(doneEventid, originId) {
        try {

            // get done event detail
            const doneDetail = await this.doneTodoDetailRepository.findData(doneEventid);
            if(!doneDetail) { return }

            // save event detail
            const { eventId, ...payload } = doneDetail
            const revertDetail = await this.eventDetailDataRepository.putData(originId, payload);

            // remove done event detail
            try { 
                await this.doneTodoDetailRepository.removeData(doneEventid)
            } catch { }
            
            return revertDetail

        } catch (error) { }
    }

    async removeDoneTodoDetails(eventIds) {
        return this.doneTodoDetailRepository.removeDatas(eventIds)
    }
}

module.exports = EventDetailDataService;