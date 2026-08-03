import { NextRequest, NextResponse } from 'next/server'
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  bffErrorResponse,
  callManagementBackend,
  clearSessionCookies,
  rotateManagementSession,
  setSessionCookies,
  validCsrf,
} from '@/api/server/session'
import { randomUuid } from '@/lib/random-id'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

async function proxy(request: NextRequest, context: Context) {
  const { path: segments } = await context.params
  const path = segments.join('/')
  if (request.method !== 'GET' && !validCsrf(request, request.cookies.get(CSRF_COOKIE)?.value)) {
    return bffErrorResponse(403, 'E_PERMISSION', 'CSRF 校验失败', '请刷新页面后重试。')
  }

  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  if (!accessToken && !refreshToken) {
    return bffErrorResponse(401, 'E_AUTH_INVALID', '管理会话已失效', '请重新登录。')
  }

  const query = request.nextUrl.search
  const body = request.method === 'GET' ? undefined : await request.arrayBuffer()
  const headers = new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken ?? ''}`,
    'X-Request-Id': request.headers.get('X-Request-Id') ?? `req_${randomUuid().replaceAll('-', '')}`,
  })
  if (body !== undefined) headers.set('Content-Type', request.headers.get('Content-Type') ?? 'application/json')
  const idempotencyKey = request.headers.get('Idempotency-Key')
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

  try {
    let refreshedSession = null
    let backend = await callManagementBackend(`/${path}${query}`, {
      method: request.method,
      headers,
      body,
    })

    if (backend.status === 401 && refreshToken) {
      const rotated = await rotateManagementSession(refreshToken)
      if (!rotated.session) {
        const response = new NextResponse(await rotated.response.text(), {
          status: rotated.response.status,
          headers: { 'Content-Type': rotated.response.headers.get('Content-Type') ?? 'application/json' },
        })
        clearSessionCookies(response)
        return response
      }
      refreshedSession = rotated.session
      accessToken = refreshedSession.access_token
      headers.set('Authorization', `Bearer ${accessToken}`)
      backend = await callManagementBackend(`/${path}${query}`, {
        method: request.method,
        headers,
        body,
      })
    }

    const responseBody = [204, 205, 304].includes(backend.status)
      ? null
      : await backend.arrayBuffer()
    const response = new NextResponse(responseBody, {
      status: backend.status,
      headers: {
        'Content-Type': backend.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    })
    for (const name of ['X-Request-Id', 'Idempotent-Replay']) {
      const value = backend.headers.get(name)
      if (value) response.headers.set(name, value)
    }
    if (refreshedSession) setSessionCookies(response, refreshedSession)
    if (backend.status === 401) clearSessionCookies(response)
    return response
  } catch {
    return bffErrorResponse(
      502,
      'E_PROVIDER_UNAVAILABLE',
      '无法连接 HogeTalk Agent 管理接口',
      '请检查 MANAGEMENT_API_BASE_URL 与后端进程。',
    )
  }
}

export function GET(request: NextRequest, context: Context) {
  return proxy(request, context)
}

export function POST(request: NextRequest, context: Context) {
  return proxy(request, context)
}

export function PUT(request: NextRequest, context: Context) {
  return proxy(request, context)
}

export function PATCH(request: NextRequest, context: Context) {
  return proxy(request, context)
}

export function DELETE(request: NextRequest, context: Context) {
  return proxy(request, context)
}
