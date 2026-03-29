import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn(),
  },
}))

describe('eventTagStore', () => {
  beforeEach(() => {
    useEventTagStore.setState({ tags: new Map() })
    vi.clearAllMocks()
  })

  it('태그가 없는 상태에서는 어떤 ID로도 색상을 찾을 수 없다', () => {
    // given: 빈 스토어
    // when: 임의의 ID로 색상 조회
    // then: 결과 없음
    expect(useEventTagStore.getState().getColorForTagId('any-id')).toBeUndefined()
  })

  it('태그를 불러온 후 해당 태그의 ID로 색상을 조회할 수 있다', async () => {
    // given: API가 태그 목록을 반환한다
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
      { uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' },
    ])

    // when: 태그 목록을 불러온다
    await useEventTagStore.getState().fetchAll()

    // then: 각 태그 ID로 색상을 찾을 수 있다
    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBe('#ff0000')
    expect(useEventTagStore.getState().getColorForTagId('tag-2')).toBe('#00ff00')
  })

  it('존재하지 않는 태그 ID는 색상을 찾을 수 없다', async () => {
    // given: API가 특정 태그들을 반환한다
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])
    await useEventTagStore.getState().fetchAll()

    // when: 등록되지 않은 ID로 색상 조회
    // then: 결과 없음
    expect(useEventTagStore.getState().getColorForTagId('unknown-id')).toBeUndefined()
  })

  it('API 호출이 실패해도 이전에 불러온 태그 색상은 유지된다', async () => {
    // given: 태그가 이미 로드되어 있다
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])
    await useEventTagStore.getState().fetchAll()

    // when: 재로드가 실패한다
    vi.mocked(eventTagApi.getAllTags).mockRejectedValue(new Error('network'))
    await useEventTagStore.getState().fetchAll()

    // then: 이전 태그 색상은 여전히 조회 가능하다
    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBe('#ff0000')
  })
})
