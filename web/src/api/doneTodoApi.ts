import { apiClient } from './apiClient'
import type { DoneTodo, Todo } from '../models'

export const doneTodoApi = {
  getDoneTodos(size: number, cursor?: number): Promise<DoneTodo[]> {
    const params = cursor != null
      ? `size=${size}&cursor=${cursor}`
      : `size=${size}`
    return apiClient.get(`/v1/todos/dones?${params}`)
  },

  deleteDoneTodo(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/todos/dones/${id}`)
  },

  revertDoneTodo(id: string): Promise<Todo> {
    return apiClient.post(`/v1/todos/dones/${id}/revert`)
  },
}
