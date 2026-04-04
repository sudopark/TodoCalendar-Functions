import type { EventTime } from './EventTime'
import type { Repeating } from './Repeating'
import type { NotificationOption } from './NotificationOption'

export interface Todo {
  uuid: string
  name: string
  event_tag_id?: string | null
  event_time?: EventTime | null
  repeating?: Repeating | null
  repeating_turn?: number
  exclude_repeatings?: number[]
  notification_options?: NotificationOption[] | null
  is_current: boolean
}
