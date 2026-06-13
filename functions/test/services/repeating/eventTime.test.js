const assert = require('assert')
const et = require('../../../services/repeating/eventTime')

describe('eventTime', () => {
    it('lowerBoundWithFixed / upperBoundWithFixed', () => {
        assert.equal(et.lowerBound({ time_type: 'at', timestamp: 100 }), 100)
        assert.equal(et.upperBound({ time_type: 'at', timestamp: 100 }), 100)
        assert.equal(et.lowerBound({ time_type: 'period', period_start: 10, period_end: 20 }), 10)
        assert.equal(et.upperBound({ time_type: 'period', period_start: 10, period_end: 20 }), 20)
        assert.equal(et.lowerBound({ time_type: 'allday', period_start: 10, period_end: 20, seconds_from_gmt: 32400 }), 10)
        assert.equal(et.upperBound({ time_type: 'allday', period_start: 10, period_end: 20, seconds_from_gmt: 32400 }), 20)
    })

    it('shift: 형태 유지하며 delta(ms) 가산', () => {
        assert.deepEqual(et.shift({ time_type: 'at', timestamp: 100 }, 50),
            { time_type: 'at', timestamp: 150 })
        assert.deepEqual(et.shift({ time_type: 'period', period_start: 10, period_end: 20 }, 5),
            { time_type: 'period', period_start: 15, period_end: 25 })
        assert.deepEqual(et.shift({ time_type: 'allday', period_start: 10, period_end: 20, seconds_from_gmt: 32400 }, 5),
            { time_type: 'allday', period_start: 15, period_end: 25, seconds_from_gmt: 32400 })
    })

    it('customKey: 초 단위, 형태별 포맷', () => {
        // 값이 이미 초 — Swift Int(time) 그대로 trunc
        assert.equal(et.customKey({ time_type: 'at', timestamp: 123456 }), '123456')
        assert.equal(et.customKey({ time_type: 'period', period_start: 10000, period_end: 20000 }), '10000..<20000')
        assert.equal(et.customKey({ time_type: 'allday', period_start: 10000, period_end: 20000, seconds_from_gmt: 32400 }), '10000..<20000+32400')
    })
})
