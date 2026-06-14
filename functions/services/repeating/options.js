const { OptionType } = require('./data/constants')

// WeekOrdinal JSON → { last: true } | { seq: n }
function parseWeekOrdinal(o) {
    return o && o.isLast === true ? { last: true } : { seq: o.seq }
}

// repeating.option(JSON) → 정규화 옵션. 알 수 없는 타입이면 null.
function parseRepeatingOption(opt) {
    if (!opt || typeof opt.optionType !== 'string') return null
    const type = opt.optionType
    const zone = opt.timeZone || 'UTC'
    switch (type) {
        case OptionType.everyDay:
            return { type, interval: opt.interval }
        case OptionType.everyWeek:
            return { type, interval: opt.interval, zone, dayOfWeeks: (opt.dayOfWeek || []).slice() }
        case OptionType.everyMonth: {
            const sel = opt.monthDaySelection || {}
            const selection = Array.isArray(sel.days)
                ? { kind: 'days', days: sel.days.slice() }
                : {
                    kind: 'week',
                    ordinals: (sel.weekOrdinals || []).map(parseWeekOrdinal),
                    weekDays: (sel.weekDays || []).slice(),
                }
            return { type, interval: opt.interval, zone, selection }
        }
        case OptionType.everyYear:
            return {
                type, interval: opt.interval, zone,
                months: (opt.months || []).slice(),
                ordinals: (opt.weekOrdinals || []).map(parseWeekOrdinal),
                dayOfWeeks: (opt.dayOfWeek || []).slice(),
            }
        case OptionType.everyYearSomeDay:
            return { type, interval: opt.interval, zone, month: opt.month, day: opt.day }
        case OptionType.lunar:
            return { type, zone, month: opt.month, day: opt.day }
        default:
            return null
    }
}

module.exports = { parseRepeatingOption }
