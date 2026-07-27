import { NextResponse } from 'next/server'
import { z } from 'zod'
import { managementAuthSessionSchema } from '@/api/generated/huameng'
import {
  bffErrorResponse,
  callManagementBackend,
  setSessionCookies,
} from '@/api/server/session'

const loginRequestSchema = z.object({
  phone: z.string().min(4).max(32),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  password: z.string().min(8).max(128),
}).strict()

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return bffErrorResponse(422, 'E_INPUT_INVALID', '登录请求不是有效 JSON', null)
  }

  const input = loginRequestSchema.safeParse(body)
  if (!input.success) {
    return bffErrorResponse(
      422,
      'E_INPUT_INVALID',
      '手机号、国家代码或密码格式不正确',
      input.error.issues[0]?.message ?? null,
    )
  }

  try {
    const backend = await callManagementBackend('/v1/auth/management/password/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Request-Id': request.headers.get('X-Request-Id') ?? `req_${crypto.randomUUID().replaceAll('-', '')}`,
        'User-Agent': request.headers.get('User-Agent') ?? 'hogetalk-management-bff',
      },
      body: JSON.stringify(input.data),
    })
    const payload: unknown = await backend.json()
    if (!backend.ok) return NextResponse.json(payload, { status: backend.status })

    const parsed = managementAuthSessionSchema.safeParse(payload)
    if (!parsed.success) {
      return bffErrorResponse(
        502,
        'E_CONTRACT_MISMATCH',
        '管理域登录响应不符合冻结契约',
        parsed.error.issues[0]?.message ?? null,
      )
    }

    const response = NextResponse.json({
      account: parsed.data.account,
      context: parsed.data.context,
      expires_in: parsed.data.expires_in,
    })
    setSessionCookies(response, parsed.data, crypto.randomUUID())
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
