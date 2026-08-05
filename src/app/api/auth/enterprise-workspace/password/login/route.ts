import { NextResponse } from 'next/server'
import { z } from 'zod'
import { errorEnvelopeSchema } from '@/api/generated/huameng'
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
import { enterpriseWorkspaceAuthContextSchema } from '@/api/client/enterprise-workspace'

export const dynamic = 'force-dynamic'

const enterpriseSessionSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive(),
  account: z.object({
    id: z.string(),
    status: z.enum(['active', 'suspended']),
    display_name: z.string(),
    created_at: z.string(),
  }).strict(),
  context: enterpriseWorkspaceAuthContextSchema,
}).strict()

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const input = managementLoginRequestSchema.safeParse(body)
  if (!input.success) {
    return bffErrorResponse(
      422,
      'E_INPUT_INVALID',
      '企业账号、国家代码或密码格式不正确',
      input.error.issues[0]?.message ?? null,
    )
  }

  try {
    const backend = await callManagementBackend(
      '/auth/enterprise-workspace/password/login',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Request-Id': request.headers.get('X-Request-Id')
            ?? `req_${randomUuid().replaceAll('-', '')}`,
          'User-Agent': request.headers.get('User-Agent')
            ?? 'hogetalk-management-bff',
        },
        body: JSON.stringify(managementLoginBackendBody(input.data)),
      },
    )
    const payload: unknown = await backend.json()
    if (!backend.ok) {
      const error = errorEnvelopeSchema.safeParse(payload)
      return NextResponse.json(error.success ? error.data : payload, {
        status: backend.status,
      })
    }
    const session = enterpriseSessionSchema.safeParse(payload)
    if (!session.success) {
      return bffErrorResponse(
        502,
        'E_CONTRACT_MISMATCH',
        '企业工作台登录响应不符合冻结契约',
        session.error.issues[0]?.message ?? null,
      )
    }
    const response = NextResponse.json({
      account: session.data.account,
      context: session.data.context,
      expires_in: session.data.expires_in,
    })
    setSessionCookies(response, session.data, randomUuid(), 'enterprise')
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
