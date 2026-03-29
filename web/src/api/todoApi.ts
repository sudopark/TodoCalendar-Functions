import { apiClient } from './apiClient'
import type { Todo, DoneTodo } from '../models'

export const todoApi = {
  getTodos(lower: number, upper: number): Promise<Todo[]> {
    return apiClient.get(`/v1/todos?lower=${lower}&upper=${upper}`)
  },

  getTodo(id: string): Promise<Todo> {
    return apiClient.get(`/v1/todos/todo/${id}`)
  },

  createTodo(body: { name: string; event_tag_id?: string; event_time?: unknown; repeating?: unknown; notification_options?: unknown[] }): Promise<Todo> {
    return apiClient.post('/v1/todos/todo', body)
  },

  updateTodo(id: string, body: Partial<Pick<Todo, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Todo> {
    return apiClient.put(`/v1/todos/todo/${id}`, body)
  },

  completeTodo(id: string, body: { origin: Todo; next_event_time?: unknown; next_repeating_turn?: number }): Promise<DoneTodo> {
    return apiClient.post(`/v1/todos/todo/${id}/complete`, body)
  },

  deleteTodo(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/todos/todo/${id}`)
  },
}
