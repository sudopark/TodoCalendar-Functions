// 반복 옵션 discriminator (snake_case) — 클라 EventRepeatingOption+CodableMapper와 1:1
const OptionType = Object.freeze({
    everyDay: 'every_day',
    everyWeek: 'every_week',
    everyMonth: 'every_month',
    everyYear: 'every_year',
    everyYearSomeDay: 'every_year_some_day',
    lunar: 'lunar_calendar_every_year',
})

// 앱 weekday: 일=1 ... 토=7 (Times.swift DayOfWeeks rawValue)
const WEEKDAY_MIN = 1
const WEEKDAY_MAX = 7

module.exports = { OptionType, WEEKDAY_MIN, WEEKDAY_MAX }
