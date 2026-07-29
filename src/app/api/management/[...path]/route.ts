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

const allowedRoutes = [
  { method: 'GET', pattern: /^me$/, backend: (path: string) => `/v1/management/${path}` },
  {
    method: 'POST',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/enterprise-imports$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/enterprise-imports\/imj_[A-Za-z0-9_-]{8,80}(?:\/rows)?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/(?:import-candidates|affiliations|certifications)$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/affiliations\/aff_[A-Za-z0-9_-]{8,80}$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/affiliations$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/affiliations\/aff_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/certification-levels$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/certification-levels$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^chambers\/ent_[A-Za-z0-9_-]{8,80}\/certification-levels\/(?:lvl|cfl)_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^admin\/claims(?:\/clm_[A-Za-z0-9_-]{8,80})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^admin\/claims\/clm_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^admin\/enterprise-verifications(?:\/vfa_[A-Za-z0-9_-]{8,80})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^admin\/enterprise-verifications\/vfa_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^admin\/enterprise-duplicates$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^admin\/enterprise-duplicates\/dup_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^admin\/ownership-disputes(?:\/dsp_[A-Za-z0-9_-]{8,80})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^admin\/ownership-disputes\/dsp_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/staff$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/staff-accounts$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/menu-catalog$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/chambers\/ent_[A-Za-z0-9_-]{8,80}\/admin-accounts$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/chambers\/ent_[A-Za-z0-9_-]{8,80}\/admin-accounts$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/staff\/sta_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/account$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/account\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/accounts(?:\/stats|\/acc_[A-Za-z0-9_-]{8,80}(?:\/(?:subscription|quota-ledger))?)?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/accounts\/acc_[A-Za-z0-9_-]{8,80}\/(?:action|subscription\/action|quota\/action)$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/activities(?:\/[A-Za-z][A-Za-z0-9_-]{1,100}(?:\/(?:registrations|minutes-sends))?)?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/audit-logs(?:\/(?:action-types|operators))?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/audit-logs\/export$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/chambers(?:\/ent_[A-Za-z0-9_-]{8,80})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/chambers$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/chambers\/ent_[A-Za-z0-9_-]{8,80}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/cms\/(?:articles|categories)(?:\/[A-Za-z0-9_-]{1,100})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/cms\/(?:articles|categories)$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/cms\/articles\/reorder$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/cms\/(?:articles|categories)\/[A-Za-z0-9_-]{1,100}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/(?:entitlement-definitions|inquiry-exports)$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/inquiries(?:\/[A-Za-z][A-Za-z0-9_-]{1,100})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/inquiries\/[A-Za-z][A-Za-z0-9_-]{1,100}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/notifications$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/notifications(?:\/ntf_[A-Za-z0-9_-]{8,80})?\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/media\/uploads(?:\/[A-Za-z][A-Za-z0-9_-]{1,100}\/complete)?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/plans(?:\/[A-Za-z][A-Za-z0-9_-]{1,100})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/plans(?:\/[A-Za-z][A-Za-z0-9_-]{1,100}\/action)?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/portal\/(?:dashboard|home|countries|partners|site-config\/(?:basic|seo|contact|social))$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/portal\/(?:countries|partners)$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/portal\/(?:countries|partners)\/[A-Za-z0-9_-]{1,100}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/portal\/(?:home|site-config\/(?:basic|seo|contact|social))\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/product-categories$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/product-categories(?:\/[A-Za-z][A-Za-z0-9_-]{1,100}\/action)?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'GET',
    pattern: /^management\/products(?:\/[A-Za-z][A-Za-z0-9_-]{1,100})?$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^management\/products\/[A-Za-z][A-Za-z0-9_-]{1,100}\/action$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'PUT',
    pattern: /^management\/portal\/(?:home|site-config\/(?:basic|seo|contact|social))$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'PATCH',
    pattern: /^management\/chambers\/ent_[A-Za-z0-9_-]{8,80}$/,
    backend: (path: string) => `/v1/${path}`,
  },
  {
    method: 'POST',
    pattern: /^auth\/management\/password\/set$/,
    backend: (path: string) => `/v1/${path}`,
  },
] as const

type Context = { params: Promise<{ path: string[] }> }

async function proxy(request: NextRequest, context: Context) {
  const { path: segments } = await context.params
  const path = segments.join('/')
  const route = allowedRoutes.find((item) => item.method === request.method && item.pattern.test(path))
  if (!route) {
    return bffErrorResponse(404, 'E_RESOURCE_NOT_FOUND', '管理 BFF 未开放此接口', path)
  }
  if (request.method !== 'GET' && !validCsrf(request, request.cookies.get(CSRF_COOKIE)?.value)) {
    return bffErrorResponse(403, 'E_PERMISSION', 'CSRF 校验失败', '请刷新页面后重试。')
  }

  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  if (!accessToken && !refreshToken) {
    return bffErrorResponse(401, 'E_AUTH_INVALID', '管理会话已失效', '请重新登录。')
  }

  const query = request.nextUrl.search
  const body = request.method === 'GET' ? undefined : await request.text()
  const headers = new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken ?? ''}`,
    'X-Request-Id': request.headers.get('X-Request-Id') ?? `req_${crypto.randomUUID().replaceAll('-', '')}`,
  })
  if (body !== undefined) headers.set('Content-Type', request.headers.get('Content-Type') ?? 'application/json')
  const idempotencyKey = request.headers.get('Idempotency-Key')
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

  try {
    let refreshedSession = null
    let backend = await callManagementBackend(`${route.backend(path)}${query}`, {
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
      backend = await callManagementBackend(`${route.backend(path)}${query}`, {
        method: request.method,
        headers,
        body,
      })
    }

    const response = new NextResponse(await backend.arrayBuffer(), {
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
