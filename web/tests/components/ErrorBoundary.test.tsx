import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'

function ProblemChild() {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('자식 컴포넌트가 정상이면 그대로 렌더한다', () => {
    // when
    render(
      <ErrorBoundary>
        <p>정상 컨텐츠</p>
      </ErrorBoundary>
    )

    // then
    expect(screen.getByText('정상 컨텐츠')).toBeInTheDocument()
  })

  it('자식 컴포넌트가 에러를 throw하면 에러 메시지를 표시한다', () => {
    // given
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // when
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    )

    // then
    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
