import { NextResponse } from 'next/server'
import { z } from 'zod'
import { errorEnvelopeSchema } from '@/api/generated/huameng'
import {
  bffErrorResponse,
  callManagementBackend,
  setSessionCookies,
} from '@/api/server/session'
import { randomUuid } from '@/lib/random-id'
import { enterpriseSessionSchema } from '@/api/server/enterprise-session'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  challenge_id: z.string().min(1),
  code: z.string().min(4).max(8),
}).strict()

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const input = requestSchema.safeParse(body)
  if (!input.success) {
    return bffErrorResponse(
      422,
      'E_INPUT_INVALID',
      '验证码登录参数不正确',
      input.error.issues[0]?.message ?? null,
    )
  }

  try {
    const backend = await callManagementBackend('/v1/auth/enterprise-workspace/otp/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Request-Id': request.headers.get('X-Request-Id')
          ?? `req_${randomUuid().replaceAll('-', '')}`,
        'User-Agent': request.headers.get('User-Agent')
          ?? 'hogetalk-management-bff',
      },
      body: JSON.stringify(input.data),
    })
    const payload: unknown = await backend.json()
    if (!backend.ok) {
      const error = errorEnvelopeSchema.safeParse(payload)
      return NextResponse.json(error.success ? error.data : payload, { status: backend.status })
    }
    const parsedSession = enterpriseSessionSchema.safeParse(payload)
    if (!parsedSession.success) {
      return bffErrorResponse(
        502,
        'E_CONTRACT_MISMATCH',
        '企业工作台验证码登录响应不符合冻结契约',
        parsedSession.error.issues[0]?.message ?? null,
      )
    }
    const response = NextResponse.json({
      account: parsedSession.data.account,
      context: parsedSession.data.context,
      expires_in: parsedSession.data.expires_in,
    })
    setSessionCookies(response, parsedSession.data, randomUuid(), 'enterprise')
    return response
  } catch {
    return bffErrorResponse(
      502,
      'E_PROVIDER_UNAVAILABLE',
      '无法连接 HogeTalk Agent 企业工作台接口',
      '请检查 MANAGEMENT_API_BASE_URL 与后端进程。',
    )
  }
}
