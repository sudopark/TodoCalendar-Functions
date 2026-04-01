import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDoneTodosStore } from '../../src/stores/doneTodosStore'
import { doneTodoApi } from '../../src/api/doneTodoApi'

vi.mock('../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(),
    deleteDoneTodo: vi.fn(),
    revertDoneTodo: vi.fn(),
  },
}))

const makeDone = (id: string, done_at = 1000) => ({
  uuid: id,
  name: `done-${id}`,
  done_at,
  origin_event_id: null,
  event_time: null,
  event_tag_id: null,
})

describe('useDoneTodosStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDoneTodosStore.getState().reset()
  })

  it('fetchNext 호출 시 items에 결과가 추가된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1', 2000), makeDone('d2', 1000)])

    // when
    await useDoneTodosStore.getState().fetchNext()

    // then
    expect(useDoneTodosStore.getState().items).toHaveLength(2)
  })

  it('fetchNext 연속 호출 시 items가 누적된다', async () => {
    // given: 첫 번째 응답 20개, 두 번째 응답 5개
    const page1 = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, 2000 - i))
    const page2 = [makeDone('d20', 100)]
    vi.mocked(doneTodoApi.getDoneTodos)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)

    // when
    await useDoneTodosStore.getState().fetchNext()
    await useDoneTodosStore.getState().fetchNext()

    // then
    expect(useDoneTodosStore.getState().items).toHaveLength(21)
    expect(useDoneTodosStore.getState().hasMore).toBe(false)
  })

  it('반환 개수가 PAGE_SIZE 미만이면 hasMore가 false가 된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])

    // when
    await useDoneTodosStore.getState().fetchNext()

    // then
    expect(useDoneTodosStore.getState().hasMore).toBe(false)
  })

  it('remove 호출 시 items에서 해당 항목이 제거된다', async () => {
    // given
    useDoneTodosStore.setState({ items: [makeDone('d1'), makeDone('d2')] })
    vi.mocked(doneTodoApi.deleteDoneTodo).mockResolvedValue({ status: 'ok' })

    // when
    await useDoneTodosStore.getState().remove('d1')

    // then
    expect(useDoneTodosStore.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('revert 호출 시 items에서 해당 항목이 제거된다', async () => {
    // given
    useDoneTodosStore.setState({ items: [makeDone('d1'), makeDone('d2')] })
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({
      uuid: 'd1', name: 'done-d1', is_current: true,
    } as any)

    // when
    await useDoneTodosStore.getState().revert('d1')

    // then
    expect(useDoneTodosStore.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('reset 호출 시 상태가 초기화된다', async () => {
    // given
    useDoneTodosStore.setState({ items: [makeDone('d1')], hasMore: false, cursor: 999 })

    // when
    useDoneTodosStore.getState().reset()

    // then
    const state = useDoneTodosStore.getState()
    expect(state.items).toHaveLength(0)
    expect(state.hasMore).toBe(true)
    expect(state.cursor).toBeNull()
  })
})
