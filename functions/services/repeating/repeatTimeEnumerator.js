const { parseRepeatingOption } = require('./options')
const { nextDateByOption } = require('./nextDate')
const et = require('./eventTime')

const ITERATION_GUARD = 10000

class RepeatTimeEnumerator {
    constructor(optionJson, end = {}) {
        this.option = parseRepeatingOption(optionJson)
        this.until = end.until ?? null
        this.endCount = end.endCount ?? null
        this.excludes = end.excludes ?? new Set()
    }
    isValid() { return this.option != null }

    nextEventTime(from, until, _depth = 0) {
        if (this.option == null || _depth > ITERATION_GUARD) return null
        const currentStart = et.lowerBound(from.time)
        const nextStart = nextDateByOption(this.option, currentStart)
        if (nextStart == null) return null
        const deltaMs = nextStart - currentStart
        const nextTime = et.shift(from.time, deltaMs)
        if (this.excludes.has(et.customKey(nextTime))) {
            return this.nextEventTime({ time: nextTime, turn: from.turn }, until, _depth + 1)
        }
        const next = { time: nextTime, turn: from.turn + 1 }
        if (until != null && et.upperBound(nextTime) > until) return null
        if (this.endCount != null && next.turn > this.endCount) return null
        return next
    }

    nextEventTimes(start, until) {
        const out = []
        let cursor = start
        let guard = 0
        for (;;) {
            const next = this.nextEventTime(cursor, until)
            if (next == null) break
            out.push(next)
            cursor = next
            if (++guard > ITERATION_GUARD) break
        }
        return out
    }
}

module.exports = { RepeatTimeEnumerator, ITERATION_GUARD }
