import { afterEach, describe, expect, it, vi } from 'vitest'
import { rotateManagementSession } from './session'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('rotateManagementSession', () => {
  it('reuses one backend rotation for concurrent requests with the same refresh token', async () => {
    vi.useFakeTimers()
    const backend = vi.fn(async () => new Response(JSON.stringify({
      access_token: 'access-next',
      refresh_token: 'refresh-next',
      token_type: 'Bearer',
      expires_in: 900,
      account: {
        id: 'acc_test',
        status: 'active',
        display_name: '测试账号',
        created_at: '2026-07-28T00:00:00Z',
      },
      context: {
        type: 'management',
        account_id: 'acc_test',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', backend)

    const [first, second] = await Promise.all([
      rotateManagementSession('refresh-concurrent-test'),
      rotateManagementSession('refresh-concurrent-test'),
    ])

    expect(backend).toHaveBeenCalledTimes(1)
    expect(first.session?.access_token).toBe('access-next')
    expect(second.session?.access_token).toBe('access-next')
    expect(first.response).not.toBe(second.response)

    vi.runAllTimers()
  })

  it('gives each concurrent caller a readable copy of a failed rotation response', async () => {
    vi.useFakeTimers()
    const backend = vi.fn(async () => Response.json({
      error: { code: 'E_AUTH_INVALID', message: '刷新凭证已失效' },
    }, { status: 401 }))
    vi.stubGlobal('fetch', backend)

    const [first, second] = await Promise.all([
      rotateManagementSession('refresh-failure-test'),
      rotateManagementSession('refresh-failure-test'),
    ])

    expect(backend).toHaveBeenCalledTimes(1)
    expect(first.session).toBeNull()
    expect(second.session).toBeNull()
    await expect(first.response.json()).resolves.toMatchObject({ error: { code: 'E_AUTH_INVALID' } })
    await expect(second.response.json()).resolves.toMatchObject({ error: { code: 'E_AUTH_INVALID' } })

    vi.runAllTimers()
  })
})
