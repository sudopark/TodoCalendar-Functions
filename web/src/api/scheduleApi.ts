import { apiClient } from './apiClient'
import type { Schedule, EventTime, Repeating } from '../models'

export const scheduleApi = {
  getSchedules(lower: number, upper: number): Promise<Schedule[]> {
    return apiClient.get(`/v1/schedules?lower=${lower}&upper=${upper}`)
  },

  getSchedule(id: string): Promise<Schedule> {
    return apiClient.get(`/v1/schedules/schedule/${id}`)
  },

  createSchedule(body: { name: string; event_tag_id?: string; event_time: EventTime; repeating?: Repeating; notification_options?: unknown[] }): Promise<Schedule> {
    return apiClient.post('/v1/schedules/schedule', body)
  },

  updateSchedule(id: string, body: Partial<Pick<Schedule, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Schedule> {
    return apiClient.put(`/v1/schedules/schedule/${id}`, body)
  },

  excludeRepeating(id: string, body: { exclude_repeatings: number[] }): Promise<Schedule> {
    return apiClient.patch(`/v1/schedules/schedule/${id}/exclude`, body)
  },

  deleteSchedule(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/schedules/schedule/${id}`)
  },
}
