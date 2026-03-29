import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedDate: null })
  })

  it('초기 상태에서 selectedDate는 null이다', () => {
    expect(useUiStore.getState().selectedDate).toBeNull()
  })

  it('setSelectedDate로 날짜를 설정할 수 있다', () => {
    const date = new Date(2026, 2, 15)
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toEqual(date)
  })

  it('같은 날짜를 다시 선택하면 선택이 해제된다', () => {
    const date = new Date(2026, 2, 15)
    useUiStore.getState().setSelectedDate(date)
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toBeNull()
  })
})
