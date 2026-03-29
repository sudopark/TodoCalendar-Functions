import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHolidayStore } from '../../src/stores/holidayStore'

vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: {
    getHolidays: vi.fn(),
  },
}))

describe('holidayStore', () => {
  beforeEach(() => {
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('초기 상태에서 holidays는 빈 Map이다', () => {
    expect(useHolidayStore.getState().holidays.size).toBe(0)
  })

  it('fetchHolidays 호출 시 dateKey→공휴일명 배열로 저장한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({
      items: [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
        { summary: '삼일절', start: { date: '2026-03-01' }, end: { date: '2026-03-02' } },
      ],
    })

    await useHolidayStore.getState().fetchHolidays(2026)

    const holidays = useHolidayStore.getState().holidays
    expect(holidays.get('2026-01-01')).toEqual(['신정'])
    expect(holidays.get('2026-03-01')).toEqual(['삼일절'])
  })

  it('같은 연도를 다시 요청하면 API를 호출하지 않는다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({ items: [] })

    await useHolidayStore.getState().fetchHolidays(2026)
    await useHolidayStore.getState().fetchHolidays(2026)

    expect(holidayApi.getHolidays).toHaveBeenCalledTimes(1)
  })

  it('fetchHolidays 실패 시 기존 상태를 유지한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockRejectedValue(new Error('network'))

    await useHolidayStore.getState().fetchHolidays(2026)

    expect(useHolidayStore.getState().holidays.size).toBe(0)
  })

  it('getHolidayNames로 특정 날짜의 공휴일명을 조회한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({
      items: [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
      ],
    })

    await useHolidayStore.getState().fetchHolidays(2026)

    expect(useHolidayStore.getState().getHolidayNames('2026-01-01')).toEqual(['신정'])
    expect(useHolidayStore.getState().getHolidayNames('2026-01-02')).toEqual([])
  })
})
