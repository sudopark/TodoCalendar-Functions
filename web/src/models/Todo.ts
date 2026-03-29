import type { EventTime } from './EventTime'
import type { Repeating } from './Repeating'

export interface Todo {
  uuid: string
  name: string
  event_tag_id?: string | null
  event_time?: EventTime | null
  repeating?: Repeating | null
  notification_options?: unknown[] | null
  is_current: boolean
}
