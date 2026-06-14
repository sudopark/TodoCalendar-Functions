const assert = require('assert')
const { DateTime } = require('luxon')
const dm = require('../../../services/repeating/dateMath')

const SEOUL = 'Asia/Seoul'
function dt(str, zone = SEOUL) {
    return DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm', { zone })
}

describe('dateMath', () => {
    it('appWeekday: 일요일=1, 토요일=7', () => {
        assert.equal(dm.appWeekday(dt('2023-04-16 00:00')), 1) // Sunday
        assert.equal(dm.appWeekday(dt('2023-04-22 00:00')), 7) // Saturday
        assert.equal(dm.appWeekday(dt('2023-04-17 00:00')), 2) // Monday
    })

    it('weekdayOrdinal: 그 달에서 같은 요일 몇 번째인지', () => {
        assert.equal(dm.weekdayOrdinal(dt('2023-04-01 00:00')), 1) // 1st Saturday
        assert.equal(dm.weekdayOrdinal(dt('2023-04-08 00:00')), 2) // 2nd Saturday
        assert.equal(dm.weekdayOrdinal(dt('2023-04-15 00:00')), 3)
    })

    it('addMonths: 없는 날은 luxon이 마지막 날로 clamp', () => {
        assert.equal(dm.addMonths(dt('2023-01-31 00:00'), 1).day, 28) // Feb
    })

    it('dateBySettingDay: 그 달에 없는 일자면 null (skip 신호)', () => {
        assert.equal(dm.dateBySettingDay(dt('2023-02-15 00:00'), 30), null)
        assert.equal(dm.dateBySettingDay(dt('2023-02-15 00:00'), 28).day, 28)
    })

    it('firstWeekday: 그 달 첫 번째 해당 요일 (day=화요일=3)', () => {
        // 2023-04 첫 화요일 = 4/4
        assert.equal(dm.firstWeekday(dt('2023-04-20 09:00'), 3).day, 4)
        // 시각 보존
        assert.equal(dm.firstWeekday(dt('2023-04-20 09:00'), 3).hour, 9)
    })

    it('lastOfSameWeekday: 그 달 마지막 같은 요일', () => {
        // 2023-04 마지막 목요일 = 4/27
        assert.equal(dm.lastOfSameWeekday(dt('2023-04-06 00:00')).day, 27)
    })

    it('syncTimes: 시/분/초를 다른 날짜에서 가져와 세팅', () => {
        const r = dm.syncTimes(dt('2023-05-01 00:00'), dt('2023-04-20 07:30'))
        assert.equal(r.hour, 7); assert.equal(r.minute, 30); assert.equal(r.day, 1)
    })
})
