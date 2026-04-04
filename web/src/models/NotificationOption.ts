export interface NotificationTimeOption {
  type: 'time'
  seconds: number
}

export interface NotificationAllDayOption {
  type: 'allday'
  dayOffset: number
  hour: number
  minute: number
}

export type NotificationOption = NotificationTimeOption | NotificationAllDayOption
