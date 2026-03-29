import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const getIdToken = vi.fn().mockResolvedValue('test-token')
  return {
    getIdToken,
    auth: { currentUser: { getIdToken } },
  }
})

vi.mock('../../src/firebase', () => ({ auth: mocks.auth }))

describe('apiClient', () => {
  beforeEach(() => {
    mocks.auth.currentUser = { getIdToken: mocks.getIdToken }
    mocks.getIdToken.mockResolvedValue('test-token')
    vi.clearAllMocks()
    mocks.getIdToken.mockResolvedValue('test-token')
  })

  it('인증된 사용자의 요청에는 Authorization 헤더가 포함된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await apiClient.get('/v1/test')

    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-token',
    })
  })

  it('서버가 성공 응답을 반환하면 JSON 데이터를 반환한다', async () => {
    const payload = { id: '1', name: 'Test' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const result = await apiClient.get<typeof payload>('/v1/test')

    expect(result).toEqual(payload)
  })

  it('서버가 4xx/5xx를 반환하면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow()
  })

  it('로그인하지 않은 상태에서는 요청이 거부된다', async () => {
    mocks.auth.currentUser = null as any

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow()
  })
})
