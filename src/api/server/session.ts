import { NextResponse } from 'next/server'
import { randomUuid } from '@/lib/random-id'

export const ACCESS_COOKIE = 'hm_management_access'
export const CSRF_COOKIE = 'hm_management_csrf'
export const DOMAIN_COOKIE = 'hm_management_domain'
const LEGACY_REFRESH_COOKIE = 'hm_management_refresh'

const secure = process.env.NODE_ENV === 'production'
const sessionCookie = {
  httpOnly: true,
  secure,
  sameSite: 'strict' as const,
  path: '/',
}

function apiBaseUrl() {
  const value = (process.env.MANAGEMENT_API_BASE_URL ?? 'http://127.0.0.1:8790/v1').replace(/\/+$/, '')
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('MANAGEMENT_API_BASE_URL must use http or https')
  }
  return url.toString().replace(/\/+$/, '')
}

function appendApiPath(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = new URL(baseUrl)
  const basePath = base.pathname.replace(/\/+$/, '')

  if (basePath === '/v1' && normalizedPath.startsWith('/v1/')) {
    return `${base.origin}${basePath}${normalizedPath.slice(3)}`
  }

  return `${base.origin}${basePath}${normalizedPath}`
}

export function callManagementBackend(path: string, init: RequestInit) {
  const target = appendApiPath(apiBaseUrl(), path)
  return fetch(target, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
}

export function setSessionCookies(
  response: NextResponse,
  session: { access_token: string; expires_in: number },
  csrfToken?: string,
  domain: 'management' | 'enterprise' = 'management',
) {
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    ...sessionCookie,
    maxAge: session.expires_in,
  })
  response.cookies.set(LEGACY_REFRESH_COOKIE, '', { ...sessionCookie, maxAge: 0 })
  response.cookies.set(DOMAIN_COOKIE, domain, {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: session.expires_in,
  })
  if (csrfToken) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: session.expires_in,
    })
  }
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, LEGACY_REFRESH_COOKIE, CSRF_COOKIE, DOMAIN_COOKIE]) {
    response.cookies.set(name, '', {
      ...sessionCookie,
      httpOnly: name !== CSRF_COOKIE && name !== DOMAIN_COOKIE,
      maxAge: 0,
    })
  }
}

export function validCsrf(request: Request, cookieValue: string | undefined) {
  const headerValue = request.headers.get('X-Management-CSRF')
  return Boolean(cookieValue && headerValue && cookieValue === headerValue)
}

export function bffErrorResponse(
  status: number,
  code: string,
  message: string,
  hint: string | null,
) {
  const requestId = `req_${randomUuid().replaceAll('-', '')}`
  return NextResponse.json({
    request_id: requestId,
    error: {
      code,
      message,
      hint,
      where: 'management-bff',
      trace_id: null,
      retryable: status >= 500,
      client_action: status === 401 ? 'login' : 'retry',
      field: null,
      retry_after: null,
      doc_url: null,
    },
  }, {
    status,
    headers: { 'X-Request-Id': requestId },
  })
}
