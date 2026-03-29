import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ForemostEventBanner } from '../../src/components/ForemostEventBanner'
import { useForemostEventStore } from '../../src/stores/foremostEventStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/stores/foremostEventStore', () => ({ useForemostEventStore: vi.fn() }))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: { getForemostEvent: async () => null },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderComponent() {
  return render(
    <MemoryRouter>
      <ForemostEventBanner />
    </MemoryRouter>
  )
}

describe('ForemostEventBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
      selector({ getColorForTagId: () => null })
    )
  })

  it('고정 이벤트가 없으면 아무것도 렌더링하지 않는다', () => {
    vi.mocked(useForemostEventStore).mockImplementation((selector: any) =>
      selector({ foremostEvent: null, fetch: vi.fn() })
    )

    const { container } = renderComponent()

    expect(container.firstChild).toBeNull()
  })

  it('고정 이벤트가 있으면 이벤트 이름을 배너에 표시한다', () => {
    const todo = { uuid: 'fe1', name: '중요한 할 일', is_current: false, event_time: null }
    vi.mocked(useForemostEventStore).mockImplementation((selector: any) =>
      selector({ foremostEvent: { event_id: 'fe1', is_todo: true, event: todo }, fetch: vi.fn() })
    )

    renderComponent()

    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
    expect(screen.getByText('고정')).toBeInTheDocument()
  })

  it('배너를 클릭하면 이벤트 상세 페이지로 이동한다', async () => {
    const todo = { uuid: 'fe-nav', name: '고정 이벤트', is_current: false, event_time: null }
    vi.mocked(useForemostEventStore).mockImplementation((selector: any) =>
      selector({ foremostEvent: { event_id: 'fe-nav', is_todo: true, event: todo }, fetch: vi.fn() })
    )

    renderComponent()
    await userEvent.click(screen.getByTestId('foremost-banner'))

    expect(mockNavigate).toHaveBeenCalledWith('/events/fe-nav')
  })
})
