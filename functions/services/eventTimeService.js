

class EventTimeService {

    constructor(eventTimeRepository) {
        this.eventTimeRepository = eventTimeRepository
    }

    async updateEventTime (userId, eventId, time, repeating) {
        const ranges = this.#range(time, repeating);
        const payload = {userId: userId, ...ranges}
        try {
            let result = await this.eventTimeRepository.updateTime(eventId, payload)
            return result

        } catch (error) {
            throw error
        }
    };

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

module.exports = EventTimeService;