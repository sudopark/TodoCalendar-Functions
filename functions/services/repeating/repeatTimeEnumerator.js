const { parseRepeatingOption } = require('./options')
const { nextDateByOption } = require('./nextDate')
const et = require('./eventTime')

class RepeatTimeEnumerator {
    constructor(optionJson, end = {}) {
        this.option = parseRepeatingOption(optionJson)
        this.until = end.until ?? null
        this.endCount = end.endCount ?? null
        this.excludes = end.excludes ?? new Set()
    }

    isValid() { return this.option != null }

    // from 다음 회차. 더 없으면 null.
    // exclude된 회차는 turn을 소비하지 않고 건너뛴다 (Swift와 동일하게 종료 조건보다 먼저 판정).
    // 종료: 이벤트 자체 종료일(this.until = repeating.end)과 조회 상한(until 파라미터)을 둘 다 cap, 그다음 endCount.
    nextEventTime(from, until) {
        if (this.option == null) return null

        let cursorTime = from.time
        for (;;) {
            const currentStart = et.lowerBound(cursorTime)
            const nextStart = nextDateByOption(this.option, currentStart)
            if (nextStart == null) return null

            const nextTime = et.shift(cursorTime, nextStart - currentStart)
            if (this.excludes.has(et.customKey(nextTime))) {
                cursorTime = nextTime
                continue
            }
            if (this.until != null && et.upperBound(nextTime) > this.until) return null
            if (until != null && et.upperBound(nextTime) > until) return null

            const next = { time: nextTime, turn: from.turn + 1 }
            if (this.endCount != null && next.turn > this.endCount) return null
            return next
        }
    }

    // start 다음부터 끝까지 모든 회차. 조회 상한(until)·종료일·endCount가 상한이라 자연 종료.
    nextEventTimes(start, until) {
        const out = []
        let cursor = start
        let next
        while ((next = this.nextEventTime(cursor, until)) != null) {
            out.push(next)
            cursor = next
        }
        return out
    }

    // startTime(첫 회차, turn 1)부터 t 직전까지 전진해 { time, turn } 회복. §4 Phase 1.
    // daily는 회차 간격이 일정(interval일)해 닫힌 산술로 단번에 점프하고,
    // 그 외 옵션은 한 회차씩 순회한다(경과 주기 수에 bound — daily처럼 일 단위로 폭발하지 않음).
    seekTurnUntil(startTime, t) {
        if (this.option == null) return { time: startTime, turn: 1 }
        const lowerOf = (time) => et.lowerBound(time)
        if (lowerOf(startTime) >= t) return { time: startTime, turn: 1 }

        let cursor = { time: startTime, turn: 1 }
        if (this.option.type === 'every_day' && this.excludes.size === 0) {
            const stepSec = this.option.interval * 86400
            const steps = Math.floor((t - 1 - lowerOf(startTime)) / stepSec)
            if (steps > 0) {
                const jumpedSec = lowerOf(startTime) + steps * stepSec
                cursor = { time: et.shift(startTime, jumpedSec - lowerOf(startTime)), turn: 1 + steps }
            }
        }
        let next
        while ((next = this.nextEventTime(cursor, null)) != null && lowerOf(next.time) < t) {
            cursor = next
        }
        return cursor
    }
}

module.exports = { RepeatTimeEnumerator }
