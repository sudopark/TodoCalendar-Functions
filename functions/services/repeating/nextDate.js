const dm = require('./dateMath')
const { OptionType } = require('./data/constants')
const { nextLunarYearMs } = require('./lunar/lunarYear')

// dayOfWeeks(앱 1-7 배열)에서 current 다음 요일. Swift Array<DayOfWeeks>.next.
function nextWeekday(dayOfWeeks, current) {
    return dayOfWeeks.find((d) => d > current)
}

function nextEveryWeek(opt, cur) {
    const sameWeek = (() => {
        const nx = nextWeekday(opt.dayOfWeeks, cur.weekday)
        if (nx == null) return null
        return dm.addDays(cur.dt, nx - cur.weekday)
    })()
    if (sameWeek) return sameWeek
    const first = opt.dayOfWeeks[0]
    if (first == null) return null
    return dm.addDays(cur.dt, first - cur.weekday).plus({ days: opt.interval * 7 })
}

// WeekOrdinal 배열에서 current 기준 다음 ordinal의 날짜. Swift Array<WeekOrdinal>.next.
function nextOrdinalDate(ordinals, dtv) {
    const ordinal = dm.weekdayOrdinal(dtv)
    for (const o of ordinals) {
        if (o.last) {
            const last = dm.lastOfSameWeekday(dtv)
            if (last && last > dtv) return last
        } else if (ordinal < o.seq) {
            return dm.addDays(dtv, (o.seq - ordinal) * 7)
        }
    }
    return null
}

function ordinalValue(o, dtv) {
    if (o.last) {
        const last = dm.lastOfSameWeekday(dtv)
        return last ? dm.weekdayOrdinal(last) : null
    }
    return o.seq
}

// 다음 달 첫 (서수,요일) 날짜. Swift findFirstOrdinalAndWeekDay.
function firstOrdinalAndWeekDay(ordinal, appWeekDay, monthDtv) {
    if (ordinal == null || appWeekDay == null) return null
    const firstWd = dm.firstWeekday(monthDtv, appWeekDay)
    if (!firstWd) return null
    const firstOrd = dm.weekdayOrdinal(firstWd)
    const targetOrd = ordinalValue(ordinal, firstWd)
    if (targetOrd == null) return null
    return dm.addDays(firstWd, (targetOrd - firstOrd) * 7)
}

function nextEveryMonthDays(opt, cur) {
    const days = opt.selection.days
    const nx = days.find((d) => d > cur.day)
    if (nx != null) {
        const cand = dm.dateBySettingDay(cur.dt, nx)
        if (cand) return cand
    }
    const first = days[0]
    if (first == null) return null
    const base = dm.addMonths(dm.firstDayOfMonth(cur.dt), opt.interval)
    return dm.syncTimes(dm.addDays(base, first - 1), cur.dt)
}

function nextEveryMonthWeek(opt, cur) {
    const { ordinals, weekDays } = opt.selection
    const sameMonth = (cand) => cand && cand.month === cur.month
    const nx = nextWeekday(weekDays, cur.weekday)
    if (nx != null) {
        const c = dm.addDays(cur.dt, nx - cur.weekday)
        if (sameMonth(c)) return c
    }
    if (weekDays[0] != null) {
        const base = dm.addDays(cur.dt, weekDays[0] - cur.weekday)
        const c = nextOrdinalDate(ordinals, base)
        if (sameMonth(c)) return c
    }
    const nextMonth = dm.addMonths(cur.dt, opt.interval)
    const c = firstOrdinalAndWeekDay(ordinals[0], weekDays[0], nextMonth)
    if (c && c.month === nextMonth.month) return c
    return null
}

function nextMonthInterval(months, currentMonth) {
    const m = months.find((x) => x > currentMonth)
    return m == null ? null : m - currentMonth
}

function nextEveryYear(opt, cur) {
    const sameYear = (cand) => cand && cand.year === cur.year
    const nx = nextWeekday(opt.dayOfWeeks, cur.weekday)
    if (nx != null) {
        const c = dm.addDays(cur.dt, nx - cur.weekday)
        if (sameYear(c)) return c
    }
    if (opt.dayOfWeeks[0] != null) {
        const base = dm.addDays(cur.dt, opt.dayOfWeeks[0] - cur.weekday)
        const c = nextOrdinalDate(opt.ordinals, base)
        if (c && c.month === cur.month && sameYear(c)) return c
    }
    const mi = nextMonthInterval(opt.months, cur.month)
    if (mi != null) {
        const nextMonth = dm.addMonths(cur.dt, mi)
        const c = firstOrdinalAndWeekDay(opt.ordinals[0], opt.dayOfWeeks[0], nextMonth)
        if (c && c.month === nextMonth.month && sameYear(c)) return c
    }
    const firstMonth = opt.months[0], firstOrd = opt.ordinals[0], firstWd = opt.dayOfWeeks[0]
    if (firstMonth == null || firstOrd == null || firstWd == null) return null
    const nextYearMonth = dm.setMonth(dm.addYears(cur.dt, opt.interval), firstMonth)
    const c = firstOrdinalAndWeekDay(firstOrd, firstWd, nextYearMonth)
    if (c && c.month === nextYearMonth.month) return c
    return null
}

// 다음 회차 '시작' ms 반환 (null이면 더 없음).
function nextDateByOption(opt, currentMs) {
    const zone = opt.zone || 'UTC'
    const dtv = dm.fromMs(currentMs, opt.type === OptionType.everyDay ? 'UTC' : zone)
    const cur = { dt: dtv, year: dtv.year, month: dtv.month, day: dtv.day, weekday: dm.appWeekday(dtv) }

    let next = null
    switch (opt.type) {
        case OptionType.everyDay: next = dm.addDays(cur.dt, opt.interval); break
        case OptionType.everyWeek: next = nextEveryWeek(opt, cur); break
        case OptionType.everyMonth:
            next = opt.selection.kind === 'days' ? nextEveryMonthDays(opt, cur) : nextEveryMonthWeek(opt, cur); break
        case OptionType.everyYear: next = nextEveryYear(opt, cur); break
        case OptionType.everyYearSomeDay: next = dm.addYears(cur.dt, opt.interval); break
        case OptionType.lunar: return nextLunarYearMs(currentMs, zone)
        default: return null
    }
    return next ? next.toMillis() : null
}

module.exports = { nextDateByOption }
