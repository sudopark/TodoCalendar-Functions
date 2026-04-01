import { apiClient } from './apiClient'

export const accountApi = {
  deleteAccount(): Promise<{ status: string }> {
    return apiClient.delete('/v1/accounts/account')
  },
}
