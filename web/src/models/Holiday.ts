export interface HolidayItem {
  summary: string
  start: { date: string }
  end: { date: string }
}

export interface HolidayResponse {
  items: HolidayItem[]
}
