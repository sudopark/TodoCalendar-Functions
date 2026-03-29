import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('apiClient', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { tokenProvider } = await import('../../src/api/tokenProvider')
    vi.mocked(tokenProvider.getToken).mockResolvedValue('test-token')
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

  it('서버가 204 No Content를 반환하면 undefined를 반환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const result = await apiClient.delete('/v1/test/1')

    expect(result).toBeUndefined()
  })

  it('서버가 4xx/5xx를 반환하면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow()
  })

  it('토큰을 가져올 수 없으면 요청이 거부된다', async () => {
    const { tokenProvider } = await import('../../src/api/tokenProvider')
    vi.mocked(tokenProvider.getToken).mockRejectedValue(new Error('Not authenticated'))

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow('Not authenticated')
  })
})
