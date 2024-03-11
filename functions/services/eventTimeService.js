

class EventTimeService {

    constructor({ eventTimeRepository} ) {
        this.eventTimeRepository = eventTimeRepository
    }

    async updateEventTime (eventId, time, repeating) {
        let ranges = this.range(time, repeating);
        try {
            let result = await this.eventTimeRepository.updateTime(eventId, ranges)
            return result

        } catch (error) {
            throw error
        }
    };

    range(time, repeating) {
        switch (time?.time_type) {
            case 'at':
                return {
                    lower: repeating?.start != null 
                        ? repeating.start : time.timestamp, 
                    upper: repeating?.end != null
                        ? repeating.end : time.timestamp
                }
    
            case 'period':
                return {
                    lower: repeating?.start != null 
                        ? repeating.start : time.period_start, 
                    upper: repeating?.end != null
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