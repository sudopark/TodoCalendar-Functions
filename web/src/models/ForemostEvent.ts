import type { Todo } from './Todo'
import type { Schedule } from './Schedule'

export interface ForemostEvent {
  event_id: string
  is_todo: boolean
  event?: Todo | Schedule | null
}
