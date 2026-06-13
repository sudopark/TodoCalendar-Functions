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

    // startTime(첫 회차, turn 1)부터 t 직전까지 전진해 { time, turn } 회복.
    // t '이상'은 결과에서 제외(다음 emit이 시작될 지점). §4 Phase 1.
    // daily는 닫힌 산술로 점프해 호출 횟수를 줄이고, 나머지는 주기 loop로 맞춘다.
    seekTurnUntil(startTime, t) {
        if (this.option == null) return { time: startTime, turn: 1 }
        const lb = (time) => et.lowerBound(time)
        if (lb(startTime) >= t) return { time: startTime, turn: 1 }

        let cursor = { time: startTime, turn: 1 }
        // daily 닫힌 산술 점프 (exclude 없을 때만; 있으면 loop fallback)
        if (this.option.type === 'every_day' && this.excludes.size === 0) {
            const stepSec = this.option.interval * 86400
            const n = Math.floor((t - 1 - lb(startTime)) / stepSec)
            if (n > 0) {
                const jumpedStart = lb(startTime) + n * stepSec
                cursor = { time: et.shift(startTime, jumpedStart - lb(startTime)), turn: 1 + n }
            }
        }
        // 나머지(또는 daily 잔여)는 주기 loop로 정확히 (hard guard 내)
        let guard = 0
        for (;;) {
            const next = this.nextEventTime(cursor, null)
            if (next == null) break
            if (lb(next.time) >= t) break
            cursor = next
            if (++guard > ITERATION_GUARD) break
        }
        return cursor
    }
}

module.exports = { RepeatTimeEnumerator, ITERATION_GUARD }
