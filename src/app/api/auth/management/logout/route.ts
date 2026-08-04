import { NextRequest, NextResponse } from 'next/server'
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  bffErrorResponse,
  callManagementBackend,
  clearSessionCookies,
  validCsrf,
} from '@/api/server/session'
import { randomUuid } from '@/lib/random-id'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!validCsrf(request, request.cookies.get(CSRF_COOKIE)?.value)) {
    return bffErrorResponse(403, 'E_PERMISSION', 'CSRF 校验失败', '请刷新页面后重试。')
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value

  try {
    if (accessToken) {
      await callManagementBackend('/auth/management/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Request-Id': `req_${randomUuid().replaceAll('-', '')}`,
        },
      })
    }
  } finally {
    const response = new NextResponse(null, { status: 204 })
    clearSessionCookies(response)
    return response
  }
}
