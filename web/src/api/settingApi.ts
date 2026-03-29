import { apiClient } from './apiClient'

export interface DefaultTagColors {
  holiday: string
  default: string
}

export const settingApi = {
  getDefaultTagColors(): Promise<DefaultTagColors> {
    return apiClient.get('/v1/setting/event/tag/default/color')
  },

  updateDefaultTagColors(body: Partial<DefaultTagColors>): Promise<DefaultTagColors> {
    return apiClient.patch('/v1/setting/event/tag/default/color', body)
  },
}
