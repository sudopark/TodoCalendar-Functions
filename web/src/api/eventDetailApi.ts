import { apiClient } from './apiClient'
import type { EventDetail } from '../models'

export const eventDetailApi = {
  getEventDetail(id: string): Promise<EventDetail> {
    return apiClient.get(`/v1/event_details/${id}`)
  },

  updateEventDetail(id: string, body: EventDetail): Promise<EventDetail> {
    return apiClient.put(`/v1/event_details/${id}`, body)
  },

  deleteEventDetail(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/event_details/${id}`)
  },
}
