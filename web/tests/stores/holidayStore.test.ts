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

  it('공휴일 데이터가 없으면 어떤 날짜를 조회해도 빈 배열을 반환한다', () => {
    // given: 빈 스토어
    // when: 임의의 날짜 조회
    // then: 빈 배열
    expect(useHolidayStore.getState().getHolidayNames('2026-01-01')).toEqual([])
  })

  it('특정 날짜의 공휴일을 불러온 후 해당 날짜로 공휴일명을 조회할 수 있다', async () => {
    // given: API가 공휴일 데이터를 반환한다
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValue({
      items: [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
        { summary: '삼일절', start: { date: '2026-03-01' }, end: { date: '2026-03-02' } },
      ],
    })

    // when: 해당 연도의 공휴일을 불러온다
    await useHolidayStore.getState().fetchHolidays(2026)

    // then: 공휴일인 날짜는 이름을 찾을 수 있고, 아닌 날짜는 빈 배열이다
    expect(useHolidayStore.getState().getHolidayNames('2026-01-01')).toEqual(['신정'])
    expect(useHolidayStore.getState().getHolidayNames('2026-03-01')).toEqual(['삼일절'])
    expect(useHolidayStore.getState().getHolidayNames('2026-06-15')).toEqual([])
  })

  it('API 호출이 실패해도 이전에 불러온 공휴일 데이터는 유지된다', async () => {
    // given: 2025년 공휴일이 로드되어 있다
    const { holidayApi } = await import('../../src/api/holidayApi')
    vi.mocked(holidayApi.getHolidays).mockResolvedValueOnce({
      items: [{ summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } }],
    })
    await useHolidayStore.getState().fetchHolidays(2025)

    // when: 다른 연도 로드가 실패한다
    vi.mocked(holidayApi.getHolidays).mockRejectedValue(new Error('network'))
    await useHolidayStore.getState().fetchHolidays(2026)

    // then: 이전에 로드된 2025년 공휴일은 여전히 조회 가능하다
    expect(useHolidayStore.getState().getHolidayNames('2025-01-01')).toEqual(['신정'])
  })
})
