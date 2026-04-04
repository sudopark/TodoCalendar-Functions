import { apiClient } from './apiClient'
import type { Todo, DoneTodo, EventTime, Repeating, NotificationOption } from '../models'

export const todoApi = {
  getTodos(lower: number, upper: number): Promise<Todo[]> {
    return apiClient.get(`/v1/todos?lower=${lower}&upper=${upper}`)
  },

  getCurrentTodos(): Promise<Todo[]> {
    return apiClient.get('/v1/todos')
  },

  getUncompletedTodos(): Promise<Todo[]> {
    return apiClient.get('/v1/todos/uncompleted')
  },

  getTodo(id: string): Promise<Todo> {
    return apiClient.get(`/v1/todos/todo/${id}`)
  },

  createTodo(body: { name: string; event_tag_id?: string; event_time?: EventTime; repeating?: Repeating; notification_options?: NotificationOption[] }): Promise<Todo> {
    return apiClient.post('/v1/todos/todo', body)
  },

  updateTodo(id: string, body: Partial<Pick<Todo, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Todo> {
    return apiClient.put(`/v1/todos/todo/${id}`, body)
  },

  completeTodo(id: string, body: { origin: Todo; next_event_time?: EventTime; next_repeating_turn?: number }): Promise<DoneTodo> {
    return apiClient.post(`/v1/todos/todo/${id}/complete`, body)
  },

  replaceTodo(id: string, body: { new: Record<string, unknown>; origin_next_event_time?: EventTime; next_repeating_turn?: number }): Promise<{ new_todo: Todo; next_repeating?: Todo }> {
    return apiClient.post(`/v1/todos/todo/${id}/replace`, body)
  },

  patchTodo(id: string, body: Record<string, unknown>): Promise<Todo> {
    return apiClient.patch(`/v1/todos/todo/${id}`, body)
  },

  deleteTodo(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/todos/todo/${id}`)
  },
}
