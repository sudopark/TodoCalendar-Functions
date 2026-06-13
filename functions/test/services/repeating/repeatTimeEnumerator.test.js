const assert = require('assert')
const { DateTime } = require('luxon')
const { RepeatTimeEnumerator } = require('../../../services/repeating/repeatTimeEnumerator')

function ms(str) {
    return DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm', { zone: 'UTC' }).toMillis()
}
const SEOUL = 'Asia/Seoul'
const atTime = (t) => ({ time_type: 'at', timestamp: t })
const periodTime = (s, e) => ({ time_type: 'period', period_start: s, period_end: e })

function makeEnum(option, { until = null, endCount = null, excludes = [] } = {}) {
    return new RepeatTimeEnumerator(option, { until, endCount, excludes: new Set(excludes) })
}

describe('RepeatTimeEnumerator — every_day', () => {
    const opt = { optionType: 'every_day', interval: 1 }
    it('interval 1: 1일 뒤, turn 0→1', () => {
        const r = makeEnum(opt).nextEventTime({ time: atTime(10), turn: 0 }, null)
        assert.deepEqual(r.time, atTime(10 + 86400000))
        assert.equal(r.turn, 1)
    })
    it('interval 3', () => {
        const r = makeEnum({ optionType: 'every_day', interval: 3 }).nextEventTime({ time: atTime(10), turn: 0 }, null)
        assert.deepEqual(r.time, atTime(10 + 3 * 86400000))
    })
    it('until 경계: 1일 뒤 <= until 통과', () => {
        const r = makeEnum({ optionType: 'every_day', interval: 1 }, { until: 2 * 86400000 })
            .nextEventTime({ time: atTime(0), turn: 0 }, 2 * 86400000)
        assert.equal(r.time.timestamp, 86400000)
    })
    it('period 형태 유지', () => {
        const r = makeEnum({ optionType: 'every_day', interval: 1 }).nextEventTime({ time: periodTime(10, 110), turn: 0 }, null)
        assert.deepEqual(r.time, periodTime(10 + 86400000, 110 + 86400000))
    })
})

describe('RepeatTimeEnumerator — every_month days([1,15,30,31]) skip', () => {
    const opt = { optionType: 'every_month', interval: 1, monthDaySelection: { days: [1, 15, 30, 31] }, timeZone: SEOUL }
    const step = (fromStr) => makeEnum(opt).nextEventTime({ time: atTime(ms(fromStr)), turn: 0 }, null)
    it('같은 달 다음 일자', () => {
        assert.equal(step('2023-01-01 01:00').time.timestamp, ms('2023-01-15 01:00'))
        assert.equal(step('2023-01-15 01:00').time.timestamp, ms('2023-01-30 01:00'))
        assert.equal(step('2023-01-30 01:00').time.timestamp, ms('2023-01-31 01:00'))
    })
    it('1/31 → 2/01 (다음 달 첫 반복일)', () => {
        assert.equal(step('2023-01-31 01:00').time.timestamp, ms('2023-02-01 01:00'))
    })
    it('2/15 → 3/01 (2월 30·31 스킵, clamp 아님)', () => {
        assert.equal(step('2023-02-15 01:00').time.timestamp, ms('2023-03-01 01:00'))
    })
    it('interval 2: 1/31 → 3/01', () => {
        const r = makeEnum({ optionType: 'every_month', interval: 2, monthDaySelection: { days: [1, 15, 30, 31] }, timeZone: SEOUL })
            .nextEventTime({ time: atTime(ms('2023-01-31 01:00')), turn: 0 }, null)
        assert.equal(r.time.timestamp, ms('2023-03-01 01:00'))
    })
})

describe('RepeatTimeEnumerator — every_year_some_day 2/29 clamp', () => {
    const make = (month, day, interval) => makeEnum({ optionType: 'every_year_some_day', interval, month, day, timeZone: SEOUL })
    it('윤년 2/29 + 1년 → 평년 2/28', () => {
        const r = make(2, 29, 1).nextEventTime({ time: atTime(ms('2020-02-29 01:00')), turn: 0 }, null)
        assert.equal(r.time.timestamp, ms('2021-02-28 01:00'))
    })
    it('2/29 + 4년 → 윤년 2/29', () => {
        const r = make(2, 29, 4).nextEventTime({ time: atTime(ms('2020-02-29 01:00')), turn: 0 }, null)
        assert.equal(r.time.timestamp, ms('2024-02-29 01:00'))
    })
    it('3/1 + 1년 → 다음해 3/1', () => {
        const r = make(3, 1, 1).nextEventTime({ time: atTime(ms('2023-03-01 01:00')), turn: 0 }, null)
        assert.equal(r.time.timestamp, ms('2024-03-01 01:00'))
    })
})

describe('RepeatTimeEnumerator — every_year (months[4,8,12], ord[2,4,last], wd[화,목])', () => {
    const opt = { optionType: 'every_year', interval: 1, months: [4, 8, 12],
        weekOrdinals: [{ isLast: false, seq: 2 }, { isLast: false, seq: 4 }, { isLast: true }],
        dayOfWeek: [3, 5], timeZone: SEOUL }
    const step = (fromStr) => makeEnum(opt).nextEventTime({ time: atTime(ms(fromStr)), turn: 0 }, null)
    it('같은 주 다음 요일', () => { assert.equal(step('2023-04-11 01:00').time.timestamp, ms('2023-04-13 01:00')) })
    it('다음 주 첫 반복요일', () => { assert.equal(step('2023-04-13 01:00').time.timestamp, ms('2023-04-25 01:00')) })
    it('다음 달 첫 반복 주/요일', () => { assert.equal(step('2023-04-27 01:00').time.timestamp, ms('2023-08-08 01:00')) })
    it('다음 해 첫 반복 달/주/요일', () => { assert.equal(step('2023-12-28 01:00').time.timestamp, ms('2024-04-09 01:00')) })
})

describe('RepeatTimeEnumerator — nextEventTimes (end / count / exclude)', () => {
    it('until까지 전부 + turn 누적', () => {
        const r = makeEnum({ optionType: 'every_day', interval: 3 }, { until: ms('2023-06-01 01:00') })
            .nextEventTimes({ time: atTime(ms('2023-05-20 01:00')), turn: 0 }, ms('2023-06-01 01:00'))
        assert.deepEqual(r.map((x) => x.time.timestamp), [
            ms('2023-05-23 01:00'), ms('2023-05-26 01:00'), ms('2023-05-29 01:00'), ms('2023-06-01 01:00'),
        ])
        assert.deepEqual(r.map((x) => x.turn), [1, 2, 3, 4])
    })
    it('count(3): turn 1 시작 → turn 2,3에서 멈춤', () => {
        const r = makeEnum({ optionType: 'every_day', interval: 3 }, { endCount: 3, until: ms('2024-06-01 01:00') })
            .nextEventTimes({ time: atTime(ms('2023-05-20 01:00')), turn: 1 }, ms('2024-06-01 01:00'))
        assert.deepEqual(r.map((x) => x.time.timestamp), [ms('2023-05-23 01:00'), ms('2023-05-26 01:00')])
        assert.deepEqual(r.map((x) => x.turn), [2, 3])
    })
    it('exclude: 제외 회차는 turn 미소비', () => {
        const excludes = [ms('2023-05-26 01:00'), ms('2023-06-01 01:00')].map((m) => `${Math.trunc(m / 1000)}`)
        const r = makeEnum({ optionType: 'every_day', interval: 3 }, { endCount: 4, until: ms('2024-06-01 01:00'), excludes })
            .nextEventTimes({ time: atTime(ms('2023-05-20 01:00')), turn: 1 }, ms('2024-06-01 01:00'))
        assert.deepEqual(r.map((x) => x.time.timestamp), [
            ms('2023-05-23 01:00'), ms('2023-05-29 01:00'), ms('2023-06-04 01:00'),
        ])
        assert.deepEqual(r.map((x) => x.turn), [2, 3, 4])
    })
})
