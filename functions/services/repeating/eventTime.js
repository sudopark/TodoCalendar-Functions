function lowerBound(time) {
    switch (time.time_type) {
        case 'at': return time.timestamp
        case 'period':
        case 'allday': return time.period_start
        default: return null
    }
}

function upperBound(time) {
    switch (time.time_type) {
        case 'at': return time.timestamp
        case 'period':
        case 'allday': return time.period_end
        default: return null
    }
}

// delta(ms)만큼 형태 유지하며 shift. Swift EventTime.shift.
function shift(time, deltaMs) {
    switch (time.time_type) {
        case 'at':
            return { time_type: 'at', timestamp: time.timestamp + deltaMs }
        case 'period':
            return { time_type: 'period', period_start: time.period_start + deltaMs, period_end: time.period_end + deltaMs }
        case 'allday':
            return {
                time_type: 'allday',
                period_start: time.period_start + deltaMs,
                period_end: time.period_end + deltaMs,
                seconds_from_gmt: time.seconds_from_gmt,
            }
        default:
            return { ...time }
    }
}

// exclude 매칭 키. Swift customKey(Int(time))와 동일하게 '초' 단위 정수 그대로.
function sec(v) { return Math.trunc(v) }
function customKey(time) {
    switch (time.time_type) {
        case 'at': return `${sec(time.timestamp)}`
        case 'period': return `${sec(time.period_start)}..<${sec(time.period_end)}`
        case 'allday': return `${sec(time.period_start)}..<${sec(time.period_end)}+${sec(time.seconds_from_gmt)}`
        default: return ''
    }
}

module.exports = { lowerBound, upperBound, shift, customKey }
