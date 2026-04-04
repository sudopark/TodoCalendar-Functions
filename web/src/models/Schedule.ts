import type { EventTime } from './EventTime'
import type { Repeating } from './Repeating'
import type { NotificationOption } from './NotificationOption'

export interface Schedule {
  uuid: string
  name: string
  event_tag_id?: string | null
  event_time: EventTime
  repeating?: Repeating | null
  notification_options?: NotificationOption[] | null
  show_turns?: number[] | null
  exclude_repeatings?: number[] | null
}
