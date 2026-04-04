import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../../src/components/Header'

describe('Header', () => {
  function renderHeader(path = '/') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>
    )
  }

  it('캘린더, Done, 설정 탭 링크를 렌더한다', () => {
    // given / when
    renderHeader('/')

    // then
    expect(screen.getByRole('link', { name: '캘린더' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '완료' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '설정' })).toBeInTheDocument()
  })

  it('/ 경로에서 캘린더 탭이 active 클래스를 갖는다', () => {
    // given / when
    renderHeader('/')

    // then
    expect(screen.getByRole('link', { name: '캘린더' })).toHaveClass('bg-gray-100')
    expect(screen.getByRole('link', { name: '완료' })).not.toHaveClass('bg-gray-100')
  })

  it('/done 경로에서 완료 탭이 active 클래스를 갖는다', () => {
    // given / when
    renderHeader('/done')

    // then
    expect(screen.getByRole('link', { name: '완료' })).toHaveClass('bg-gray-100')
    expect(screen.getByRole('link', { name: '캘린더' })).not.toHaveClass('bg-gray-100')
  })
})
