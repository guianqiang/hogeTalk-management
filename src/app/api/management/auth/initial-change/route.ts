import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  bffErrorResponse,
  callManagementBackend,
} from '@/api/server/session'

const requestSchema = z.object({
  password_change_token: z.string().min(32).max(2048),
  new_password: z.string().min(12).max(128),
}).strict()

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const input = requestSchema.safeParse(body)
  if (!input.success) {
    return bffErrorResponse(
      422,
      'E_INPUT_INVALID',
      '首次登录凭证或新密码格式不正确',
      input.error.issues[0]?.message ?? null,
    )
  }

  try {
    const backend = await callManagementBackend('/v1/auth/management/password/initial-change', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Request-Id': request.headers.get('X-Request-Id') ?? `req_${crypto.randomUUID().replaceAll('-', '')}`,
      },
      body: JSON.stringify(input.data),
    })
    if (!backend.ok) {
      return new NextResponse(await backend.arrayBuffer(), {
        status: backend.status,
        headers: {
          'Content-Type': backend.headers.get('Content-Type') ?? 'application/json',
        },
      })
    }
    return new NextResponse(null, { status: 204 })
  } catch {
    return bffErrorResponse(
      502,
      'E_PROVIDER_UNAVAILABLE',
      '无法连接 HogeTalk Agent 管理接口',
      '请检查 MANAGEMENT_API_BASE_URL 与后端进程。',
    )
  }
}
