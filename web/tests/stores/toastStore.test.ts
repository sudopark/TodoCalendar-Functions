import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore } from '../../src/stores/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useRealTimers()
  })

  it('show 호출 시 toasts 배열에 항목이 추가된다', () => {
    // when
    useToastStore.getState().show('저장 완료')

    // then
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('저장 완료')
  })

  it('show 호출 시 타입을 지정하지 않으면 기본 타입은 info이다', () => {
    // when
    useToastStore.getState().show('알림')

    // then
    expect(useToastStore.getState().toasts[0].type).toBe('info')
  })

  it('show 호출 시 타입을 지정하면 해당 타입이 설정된다', () => {
    // when
    useToastStore.getState().show('에러 발생', 'error')

    // then
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('dismiss 호출 시 해당 항목이 제거된다', () => {
    // given
    useToastStore.getState().show('첫 번째')
    useToastStore.getState().show('두 번째')
    const firstId = useToastStore.getState().toasts[0].id

    // when
    useToastStore.getState().dismiss(firstId)

    // then
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('두 번째')
  })

  it('3초 후 자동으로 dismiss된다', () => {
    // given
    vi.useFakeTimers()

    // when
    useToastStore.getState().show('자동 삭제')
    expect(useToastStore.getState().toasts).toHaveLength(1)

    // then
    vi.advanceTimersByTime(3000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
