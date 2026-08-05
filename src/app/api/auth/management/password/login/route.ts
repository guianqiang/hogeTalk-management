import { NextResponse } from 'next/server'
import {
  managementAuthSessionSchema,
  managementPasswordChangeRequiredSchema,
} from '@/api/generated/huameng'
import {
  bffErrorResponse,
  callManagementBackend,
  setSessionCookies,
} from '@/api/server/session'
import {
  managementLoginBackendBody,
  managementLoginRequestSchema,
} from '@/api/server/management-login'
import { randomUuid } from '@/lib/random-id'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return bffErrorResponse(422, 'E_INPUT_INVALID', '登录请求不是有效 JSON', null)
  }

  const input = managementLoginRequestSchema.safeParse(body)
  if (!input.success) {
    return bffErrorResponse(
      422,
      'E_INPUT_INVALID',
      '管理账号、国家代码或密码格式不正确',
      input.error.issues[0]?.message ?? null,
    )
  }

  try {
    const backend = await callManagementBackend('/auth/management/password/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Request-Id': request.headers.get('X-Request-Id') ?? `req_${randomUuid().replaceAll('-', '')}`,
        'User-Agent': request.headers.get('User-Agent') ?? 'hogetalk-management-bff',
      },
      body: JSON.stringify(managementLoginBackendBody(input.data)),
    })
    const payload: unknown = await backend.json()
    if (!backend.ok) return NextResponse.json(payload, { status: backend.status })

    const passwordChange = managementPasswordChangeRequiredSchema.safeParse(payload)
    if (passwordChange.success) {
      return NextResponse.json(passwordChange.data)
    }

    const session = managementAuthSessionSchema.safeParse(payload)
    if (!session.success) {
      return bffErrorResponse(
        502,
        'E_CONTRACT_MISMATCH',
        '管理域登录响应不符合冻结契约',
        session.error.issues[0]?.message ?? null,
      )
    }

    const response = NextResponse.json({
      account: session.data.account,
      context: session.data.context,
      expires_in: session.data.expires_in,
    })
    setSessionCookies(response, session.data, randomUuid(), 'management')
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
