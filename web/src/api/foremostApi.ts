import { apiClient } from './apiClient'
import type { ForemostEvent } from '../models'

export const foremostApi = {
  getForemostEvent(): Promise<ForemostEvent> {
    return apiClient.get('/v1/foremost/event')
  },

  setForemostEvent(body: { event_id: string; is_todo: boolean }): Promise<ForemostEvent> {
    return apiClient.put('/v1/foremost/event', body)
  },

  removeForemostEvent(): Promise<{ status: string }> {
    return apiClient.delete('/v1/foremost/event')
  },
}
