

class EventTimeRangeService {

    constructor(eventTimeRepository) {
        this.eventTimeRepository = eventTimeRepository
    }

    async updateEventTime (userId, isTodo, eventId, time, repeating) {
        let ranges = this.#range(time, repeating);
        const payload = {userId: userId, isTodo: isTodo, ...ranges}
        let result = await this.eventTimeRepository.updateTime(eventId, payload)
        return result
    };

    async removeEventTime(eventId) {
        let result = await this.eventTimeRepository.remove(eventId)
        return result
    }

    async eventIds(userId, isTodo, lower, upper) {
        let result = await this.eventTimeRepository.eventIds(userId, isTodo, lower, upper);
        return result
    }

    #range(time, repeating) {
        switch (time?.time_type) {
            case 'at':
                return {
                    lower: repeating?.start != null 
                        ? repeating.start : time.timestamp, 
                    upper: repeating != null
                        ? repeating.end : time.timestamp
                }
    
            case 'period':
                return {
                    lower: repeating?.start != null 
                        ? repeating.start : time.period_start, 
                    upper: repeating != null
                        ? repeating.end : time.period_end
                }
            
            case 'allday':
                if (time.seconds_from_gmt == null) {
                    return { }
                }
                if(repeating != null) {
                    return {
                        lower: repeating.start + time.seconds_from_gmt - 14*3600,
                        upper: repeating.end != null 
                            ?  repeating.end + time.seconds_from_gmt + 12*3600
                            : null
                    }
                } else {
                    return {
                        lower: time.period_start + time.seconds_from_gmt - 14*3600, 
                        upper: time.period_end + time.seconds_from_gmt + 12*3600
                    }
                }
            default: 
                return { }
        }
    };
}

module.exports = EventTimeRangeService;