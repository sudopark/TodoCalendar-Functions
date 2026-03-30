import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventTimeDisplay } from '../../src/components/EventTimeDisplay'
import type { EventTime } from '../../src/models'

// 모든 타임스탬프는 UTC 기준 고정값 사용 (TZ=Asia/Seoul 환경에서도 일관된 결과)
// 2024-03-15 00:00:00 UTC = 1710460800
// 2024-03-15 05:30:00 UTC = 1710480600  (= KST 14:30)
// 2024-03-15 07:30:00 UTC = 1710487800  (= KST 16:30)

describe('EventTimeDisplay', () => {
  it('at 타입 이벤트는 시각을 표시한다', () => {
    // given: 2024-03-15 05:30:00 UTC = KST 오후 2:30
    const eventTime: EventTime = { time_type: 'at', timestamp: 1710480600 }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: 오후 2:30 텍스트가 표시된다
    expect(screen.getByText(/오후 2:30/)).toBeInTheDocument()
  })

  it('period 타입 이벤트는 시작-종료 시각 범위를 표시한다', () => {
    // given: KST 오후 2:30 ~ 오후 4:30
    const eventTime: EventTime = {
      time_type: 'period',
      period_start: 1710480600,
      period_end: 1710487800,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: 시작–종료 시각이 표시된다
    expect(screen.getByText(/오후 2:30 – 오후 4:30/)).toBeInTheDocument()
  })

  it('allday 타입 이벤트가 하루짜리면 "종일"을 표시한다 (UTC 이벤트)', () => {
    // given: 2024-03-15 UTC 하루 종일 이벤트 (seconds_from_gmt=0)
    // period_start = 1710460800 (2024-03-15 00:00:00 UTC)
    // period_end   = 1710547199 (2024-03-15 23:59:59 UTC)
    const eventTime: EventTime = {
      time_type: 'allday',
      period_start: 1710460800,
      period_end: 1710547199,
      seconds_from_gmt: 0,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: "종일" 텍스트가 표시된다
    expect(screen.getByText('종일')).toBeInTheDocument()
  })

  it('allday 타입 이벤트가 여러 날이면 날짜 범위를 표시한다 (UTC 이벤트)', () => {
    // given: 2024-03-15 ~ 2024-03-17 UTC 이벤트 (seconds_from_gmt=0)
    // period_start = 1710460800 (2024-03-15 00:00:00 UTC)
    // period_end   = 1710719999 (2024-03-17 23:59:59 UTC)
    const eventTime: EventTime = {
      time_type: 'allday',
      period_start: 1710460800,
      period_end: 1710719999,
      seconds_from_gmt: 0,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: 날짜 범위가 표시된다
    expect(screen.getByText(/3월 15일.*–.*3월 17일/)).toBeInTheDocument()
  })

  it('allday 타입 이벤트가 하루짜리면 "종일"을 표시한다 (KST 이벤트)', () => {
    // given: 2024-03-15 KST 하루 종일 이벤트 (seconds_from_gmt=32400)
    // period_start = 1710428400 (2024-03-15 00:00:00 KST = 2024-03-14 15:00:00 UTC)
    // period_end   = 1710514799 (2024-03-15 23:59:59 KST = 2024-03-15 14:59:59 UTC)
    const eventTime: EventTime = {
      time_type: 'allday',
      period_start: 1710428400,
      period_end: 1710514799,
      seconds_from_gmt: 32400,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: "종일" 텍스트가 표시된다
    expect(screen.getByText('종일')).toBeInTheDocument()
  })

  it('allday 타입 이벤트가 여러 날이면 날짜 범위를 표시한다 (KST 이벤트)', () => {
    // given: 2024-03-15 ~ 2024-03-17 KST 이벤트 (seconds_from_gmt=32400)
    // period_start = 1710428400 (2024-03-15 00:00:00 KST)
    // period_end   = 1710687599 (2024-03-17 23:59:59 KST = 2024-03-17 14:59:59 UTC)
    const eventTime: EventTime = {
      time_type: 'allday',
      period_start: 1710428400,
      period_end: 1710687599,
      seconds_from_gmt: 32400,
    }

    // when: 렌더링
    render(<EventTimeDisplay eventTime={eventTime} />)

    // then: KST 기준 날짜 범위가 표시된다
    expect(screen.getByText(/3월 15일.*–.*3월 17일/)).toBeInTheDocument()
  })
})
