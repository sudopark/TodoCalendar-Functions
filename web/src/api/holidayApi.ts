import { apiClient } from './apiClient'
import type { HolidayResponse } from '../models'

export const holidayApi = {
  getHolidays(year: number, locale: string, code: string): Promise<HolidayResponse> {
    return apiClient.get(`/v1/holiday?year=${year}&locale=${locale}&code=${code}`)
  },
}
