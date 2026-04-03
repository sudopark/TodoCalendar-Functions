import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
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

describe('eventTagStore — reset', () => {
  it('reset 호출 시 초기 상태로 돌아간다', async () => {
    // given: 태그가 있는 상태
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])
    await useEventTagStore.getState().fetchAll()

    // when: reset 호출
    useEventTagStore.getState().reset()

    // then: 빈 상태
    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBeUndefined()
  })
})

describe('eventTagStore — CRUD', () => {
  beforeEach(() => {
    useEventTagStore.setState({ tags: new Map() })
    vi.clearAllMocks()
  })

  it('createTag를 호출하면 생성된 태그를 ID로 조회할 수 있다', async () => {
    // given: API가 새 태그를 반환
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockResolvedValue({ uuid: 'tag-new', name: '업무', color_hex: '#ff0000' })
    // when: 태그 생성
    await useEventTagStore.getState().createTag('업무', '#ff0000')
    // then: 태그 조회 가능
    expect(useEventTagStore.getState().getColorForTagId('tag-new')).toBe('#ff0000')
  })

  it('updateTag를 호출하면 변경된 색상으로 조회된다', async () => {
    // given: 태그가 있는 상태
    useEventTagStore.setState({ tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]) })
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.updateTag).mockResolvedValue({ uuid: 'tag-1', name: '업무', color_hex: '#0000ff' })
    // when: 색상 수정
    await useEventTagStore.getState().updateTag('tag-1', { name: '업무', color_hex: '#0000ff' })
    // then: 새 색상으로 조회됨
    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBe('#0000ff')
  })

  it('deleteTag를 호출하면 해당 태그를 더 이상 조회할 수 없다', async () => {
    // given: 태그가 있는 상태
    useEventTagStore.setState({ tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]) })
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.deleteTag).mockResolvedValue({ status: 'ok' })
    // when: 삭제
    await useEventTagStore.getState().deleteTag('tag-1')
    // then: 조회 불가
    expect(useEventTagStore.getState().getColorForTagId('tag-1')).toBeUndefined()
  })
})
