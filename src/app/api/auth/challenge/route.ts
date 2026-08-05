import { NextResponse } from 'next/server'
import { z } from 'zod'
import { errorEnvelopeSchema } from '@/api/generated/huameng'
import {
  bffErrorResponse,
  callManagementBackend,
} from '@/api/server/session'
import { enterpriseAuthChallengeSchema } from '@/api/client/enterprise-workspace'
import { randomUuid } from '@/lib/random-id'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  purpose: z.enum(['login', 'password_reset', 'bind_phone']),
  phone: z.string().min(4),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  locale: z.string(),
  risk_token: z.string(),
}).strict()

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const input = requestSchema.safeParse(body)
  if (!input.success) {
    return bffErrorResponse(
      422,
      'E_INPUT_INVALID',
      '验证码参数不正确',
      input.error.issues[0]?.message ?? null,
    )
  }

  try {
    const backend = await callManagementBackend('/auth/challenges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': request.headers.get('X-Request-Id')
          ?? `req_${randomUuid().replaceAll('-', '')}`,
        'User-Agent': request.headers.get('User-Agent') ?? 'hogetalk-management-bff',
      },
      body: JSON.stringify(input.data),
    })
    const payload: unknown = await backend.json()
    if (!backend.ok) {
      const error = errorEnvelopeSchema.safeParse(payload)
      return NextResponse.json(error.success ? error.data : payload, { status: backend.status })
    }
    const challenge = enterpriseAuthChallengeSchema.safeParse(payload)
    if (!challenge.success) {
      return bffErrorResponse(
        502,
        'E_CONTRACT_MISMATCH',
        '验证码接口返回异常',
        challenge.error.issues[0]?.message ?? null,
      )
    }
    return NextResponse.json(challenge.data)
  } catch {
    return bffErrorResponse(
      502,
      'E_PROVIDER_UNAVAILABLE',
      '无法连接 HogeTalk Agent 验证码服务',
      '请检查 MANAGEMENT_API_BASE_URL 与后端进程。',
    )
  }
}
