export interface WeekOrdinal {
  isLast: boolean
  seq?: number
}

export interface EveryDayOption {
  optionType: 'every_day'
  interval: number
}

export interface EveryWeekOption {
  optionType: 'every_week'
  interval: number
  dayOfWeek: number[]
  timeZone: string
}

export interface EveryMonthDaysSelection {
  days: number[]
}

export interface EveryMonthWeekSelection {
  weekOrdinals: WeekOrdinal[]
  weekDays: number[]
}

export type MonthDaySelection = EveryMonthDaysSelection | EveryMonthWeekSelection

export interface EveryMonthOption {
  optionType: 'every_month'
  interval: number
  monthDaySelection: MonthDaySelection
  timeZone: string
}

export interface EveryYearOption {
  optionType: 'every_year'
  interval: number
  months: number[]
  weekOrdinals: WeekOrdinal[]
  dayOfWeek: number[]
  timeZone: string
}

export interface EveryYearSomeDayOption {
  optionType: 'every_year_some_day'
  interval: number
  month: number
  day: number
  timeZone: string
}

export interface LunarCalendarEveryYearOption {
  optionType: 'lunar_calendar_every_year'
  month: number
  day: number
  timeZone: string
}

export type RepeatingOption =
  | EveryDayOption
  | EveryWeekOption
  | EveryMonthOption
  | EveryYearOption
  | EveryYearSomeDayOption
  | LunarCalendarEveryYearOption

export interface Repeating {
  start: number
  option: RepeatingOption
  end?: number
  end_count?: number
}
