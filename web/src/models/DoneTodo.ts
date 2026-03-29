import type { EventTime } from './EventTime'

export interface DoneTodo {
  uuid: string
  name: string
  origin_event_id?: string | null
  done_at?: number | null
  event_time?: EventTime | null
  event_tag_id?: string | null
}
