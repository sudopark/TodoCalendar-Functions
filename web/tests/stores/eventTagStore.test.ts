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

  it('초기 상태에서 tags는 빈 Map이다', () => {
    expect(useEventTagStore.getState().tags.size).toBe(0)
  })

  it('fetchAll 호출 시 태그를 ID→태그 Map으로 저장한다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
      { uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' },
    ])

    await useEventTagStore.getState().fetchAll()

    const tags = useEventTagStore.getState().tags
    expect(tags.size).toBe(2)
    expect(tags.get('tag-1')).toEqual({ uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' })
    expect(tags.get('tag-2')).toEqual({ uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' })
  })

  it('fetchAll 실패 시 tags는 빈 상태를 유지한다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockRejectedValue(new Error('network'))

    await useEventTagStore.getState().fetchAll()

    expect(useEventTagStore.getState().tags.size).toBe(0)
  })

  it('getColorForTagId로 태그 색상을 조회할 수 있다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])

    await useEventTagStore.getState().fetchAll()

    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBe('#ff0000')
    expect(useEventTagStore.getState().getColorForTagId('unknown')).toBeUndefined()
  })
})
