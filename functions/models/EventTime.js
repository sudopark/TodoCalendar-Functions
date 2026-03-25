

class EventTime {

    constructor(time_type, timestamp, period_start, period_end, seconds_from_gmt) {
        this.time_type = time_type;
        this.timestamp = timestamp;
        this.period_start = period_start;
        this.period_end = period_end;
        this.seconds_from_gmt = seconds_from_gmt;
    }

    static fromData(data) {
        if (data == null) return null;
        return new EventTime(
            data.time_type,
            data.timestamp,
            data.period_start,
            data.period_end,
            data.seconds_from_gmt
        );
    }

    toJSON() {
        switch (this.time_type) {
            case 'at':
                return { time_type: 'at', timestamp: this.timestamp };
            case 'period':
                return { time_type: 'period', period_start: this.period_start, period_end: this.period_end };
            case 'allday':
                return { time_type: 'allday', period_start: this.period_start, period_end: this.period_end, seconds_from_gmt: this.seconds_from_gmt };
            default:
                return { time_type: this.time_type };
        }
    }
}

module.exports = EventTime;
