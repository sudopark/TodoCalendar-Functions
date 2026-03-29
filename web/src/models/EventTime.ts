export interface EventTimeAt {
  time_type: 'at'
  timestamp: number
}

export interface EventTimePeriod {
  time_type: 'period'
  period_start: number
  period_end: number
}

export interface EventTimeAllDay {
  time_type: 'allday'
  period_start: number
  period_end: number
  seconds_from_gmt: number
}

export type EventTime = EventTimeAt | EventTimePeriod | EventTimeAllDay
