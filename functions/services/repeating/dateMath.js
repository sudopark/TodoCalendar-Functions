const { DateTime } = require('luxon')

// 앱 weekday: 일=1 ... 토=7. luxon weekday: 월=1 ... 일=7.
function appWeekday(dtv) {
    return (dtv.weekday % 7) + 1
}

// 그 달에서 같은 요일의 서수(1-based). Foundation weekdayOrdinal과 동일.
function weekdayOrdinal(dtv) {
    return Math.floor((dtv.day - 1) / 7) + 1
}

function fromMs(ms, zone) {
    return DateTime.fromMillis(ms, { zone })
}

function addDays(dtv, n) { return dtv.plus({ days: n }) }
function addMonths(dtv, n) { return dtv.plus({ months: n }) } // luxon clamps invalid day
function addYears(dtv, n) { return dtv.plus({ years: n }) }   // 2/29 +1y → 2/28 clamp

// day를 세팅하되 그 달에 없는 일자(=clamp 발생)면 null. Swift compareIsNotFloored.
function dateBySettingDay(dtv, day) {
    const r = dtv.set({ day })
    return r.day === day ? r : null
}

function firstDayOfMonth(dtv) {
    return dtv.startOf('month')
}

function lastDayOfMonth(dtv) {
    return dtv.endOf('month').startOf('day')
}

// 그 달의 첫 번째 '해당 요일'(앱 rawValue 1-7). 원본 시각 유지. Swift first(day:from:).
function firstWeekday(dtv, appDay) {
    const firstOfMonth = firstDayOfMonth(dtv)
    const firstWd = appWeekday(firstOfMonth)
    const daysToAdd = (appDay + 7 - firstWd) % 7
    return dtv.set({ day: 1 + daysToAdd })
}

// 그 달의 마지막 '같은 요일'. Swift lastOfSameWeekDay.
function lastOfSameWeekday(dtv) {
    const wd = appWeekday(dtv)
    const lastDom = lastDayOfMonth(dtv)
    const lastWd = appWeekday(lastDom)
    const daysToMinus = (lastWd - wd + 7) % 7
    return dtv.set({ day: lastDom.day - daysToMinus })
}

// originDate에 date의 시/분/초를 입힘. Swift syncTimes.
function syncTimes(originDate, date) {
    return originDate.set({ hour: date.hour, minute: date.minute, second: date.second })
}

// addYear 후 month만 firstMonth로 세팅. Swift dateBySetting{ month = ... }.
function setMonth(dtv, month) {
    return dtv.set({ month })
}

module.exports = {
    appWeekday, weekdayOrdinal, fromMs,
    addDays, addMonths, addYears,
    dateBySettingDay, firstDayOfMonth, lastDayOfMonth,
    firstWeekday, lastOfSameWeekday, syncTimes, setMonth,
}
