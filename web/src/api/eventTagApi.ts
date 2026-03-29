import { apiClient } from './apiClient'
import type { EventTag } from '../models'

export const eventTagApi = {
  getAllTags(): Promise<EventTag[]> {
    return apiClient.get('/v1/tags/all')
  },

  createTag(body: { name: string; color_hex?: string }): Promise<EventTag> {
    return apiClient.post('/v1/tags/tag', body)
  },

  updateTag(id: string, body: { name: string; color_hex?: string }): Promise<EventTag> {
    return apiClient.put(`/v1/tags/tag/${id}`, body)
  },

  deleteTag(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/tags/tag/${id}`)
  },
}
