import { NextResponse } from 'next/server'
import { managementAuthSessionSchema, type ManagementAuthSessionDto } from '@/api/generated/huameng'
import { randomUuid } from '@/lib/random-id'

export const ACCESS_COOKIE = 'hm_management_access'
export const REFRESH_COOKIE = 'hm_management_refresh'
export const CSRF_COOKIE = 'hm_management_csrf'

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

export function callManagementBackend(path: string, init: RequestInit) {
  return fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
}

export function setSessionCookies(
  response: NextResponse,
  session: ManagementAuthSessionDto,
  csrfToken?: string,
) {
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    ...sessionCookie,
    maxAge: session.expires_in,
  })
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...sessionCookie,
    maxAge: 60 * 60 * 24 * 30,
  })
  if (csrfToken) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, '', {
      ...sessionCookie,
      httpOnly: name !== CSRF_COOKIE,
      maxAge: 0,
    })
  }
}

export function validCsrf(request: Request, cookieValue: string | undefined) {
  const headerValue = request.headers.get('X-Management-CSRF')
  return Boolean(cookieValue && headerValue && cookieValue === headerValue)
}

type SessionRotationResult = {
  response: Response
  session: ManagementAuthSessionDto | null
}

const sessionRotationFlights = new Map<string, Promise<SessionRotationResult>>()

async function performManagementSessionRotation(refreshToken: string): Promise<SessionRotationResult> {
  const response = await callManagementBackend('/auth/management/refresh', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': `req_${randomUuid().replaceAll('-', '')}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const reusableResponse = response.clone()
  if (!response.ok) return { response: reusableResponse, session: null }

  const payload: unknown = await response.json()
  const parsed = managementAuthSessionSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      response: bffErrorResponse(
        502,
        'E_CONTRACT_MISMATCH',
        '管理域刷新响应不符合冻结契约',
        parsed.error.issues[0]?.message ?? null,
      ),
      session: null,
    }
  }
  return { response: reusableResponse, session: parsed.data }
}

export function rotateManagementSession(refreshToken: string) {
  const existing = sessionRotationFlights.get(refreshToken)
  if (existing) {
    return existing.then((result) => ({ ...result, response: result.response.clone() }))
  }

  const flight = performManagementSessionRotation(refreshToken)
  sessionRotationFlights.set(refreshToken, flight)
  const scheduleRelease = () => {
    setTimeout(() => {
      if (sessionRotationFlights.get(refreshToken) === flight) {
        sessionRotationFlights.delete(refreshToken)
      }
    }, 10_000)
  }
  void flight.then(scheduleRelease, scheduleRelease)
  return flight.then((result) => ({ ...result, response: result.response.clone() }))
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
