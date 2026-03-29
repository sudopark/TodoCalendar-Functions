import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventTimeDisplay } from '../../src/components/EventTimeDisplay'
import type { EventTime } from '../../src/models'

describe('EventTimeDisplay', () => {
  it('at 타입 이벤트는 시각을 표시한다', () => {
    // given: 특정 시각을 가진 at 이벤트 (로컬 오후 2:30)
    const ts = Math.floor(new Date(2024, 2, 15, 14, 30, 0).getTime() / 1000)
    const eventTime: EventTime = { time_type: 'at', timestamp: ts }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: 시간 텍스트가 표시된다
    expect(screen.getByText(/오후 2:30/)).toBeInTheDocument()
  })

  it('period 타입 이벤트는 시작-종료 시각 범위를 표시한다', () => {
    // given: 시간 범위를 가진 period 이벤트 (로컬 오후 2:30 ~ 오후 4:30)
    const start = Math.floor(new Date(2024, 2, 15, 14, 30, 0).getTime() / 1000)
    const end = Math.floor(new Date(2024, 2, 15, 16, 30, 0).getTime() / 1000)
    const eventTime: EventTime = {
      time_type: 'period',
      period_start: start,
      period_end: end,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: 시작–종료 시각이 표시된다
    expect(screen.getByText(/오후 2:30 – 오후 4:30/)).toBeInTheDocument()
  })

  it('allday 타입 이벤트가 하루짜리면 "종일"을 표시한다', () => {
    // given: 하루 종일 이벤트 — seconds_from_gmt=0으로 로컬 자정 기준
    const dayStart = Math.floor(new Date(2024, 2, 15, 0, 0, 0).getTime() / 1000)
    const dayEnd = Math.floor(new Date(2024, 2, 15, 23, 59, 59).getTime() / 1000)
    const eventTime: EventTime = {
      time_type: 'allday',
      period_start: dayStart,
      period_end: dayEnd,
      seconds_from_gmt: 0,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: "종일" 텍스트가 표시된다
    expect(screen.getByText('종일')).toBeInTheDocument()
  })

  it('allday 타입 이벤트가 여러 날이면 날짜 범위를 표시한다', () => {
    // given: 여러 날에 걸친 allday 이벤트 (2024-03-15 ~ 3-17), seconds_from_gmt=0
    const dayStart = Math.floor(new Date(2024, 2, 15, 0, 0, 0).getTime() / 1000)
    const dayEnd = Math.floor(new Date(2024, 2, 17, 23, 59, 59).getTime() / 1000)
    const eventTime: EventTime = {
      time_type: 'allday',
      period_start: dayStart,
      period_end: dayEnd,
      seconds_from_gmt: 0,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: 날짜 범위가 표시된다
    expect(screen.getByText(/3월 15일.*–.*3월 17일/)).toBeInTheDocument()
  })
})
