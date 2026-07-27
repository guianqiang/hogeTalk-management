import { ManagementApiError } from './management'

export interface ScaffoldedRecord {
  id: string
  title: string
  subtitle?: string | null
  cover?: string | null
  cover_url?: string | null
  image?: string | null
  category?: string | null
  country?: string | null
  status: string
  sort?: number
  is_home?: boolean
  created_at?: string
  updated_at?: string
}

export interface ScaffoldedPage {
  items: ScaffoldedRecord[]
  next_cursor: string | null
}

export interface HomeStatRow {
  id: string
  label: string
  value: string
}

export interface HomeStatsResponse {
  items: HomeStatRow[]
}

function csrfToken() {
  if (typeof document === 'undefined') return ''
  const prefix = 'hm_management_csrf='
  const value = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length) ?? ''
  return value ? decodeURIComponent(value) : ''
}

function idempotencyKey() {
  return `idem_${crypto.randomUUID().replaceAll('-', '')}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? 'GET'
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD'].includes(method)) {
    headers.set('X-Management-CSRF', csrfToken())
    headers.set('Idempotency-Key', idempotencyKey())
  }

  const response = await fetch(`/api/management/${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as {
    error?: { code?: string; message?: string; hint?: string | null }
    request_id?: string
  } | T | null

  if (!response.ok) {
    const envelope = body && typeof body === 'object' && 'error' in body ? body.error : undefined
    throw new ManagementApiError(
      response.status,
      envelope?.code ?? 'E_PROVIDER_UNAVAILABLE',
      envelope?.message ?? '服务暂时不可用，请稍后重试',
      envelope?.hint ?? null,
      body && typeof body === 'object' && 'request_id' in body ? body.request_id ?? null : null,
    )
  }
  return body as T
}

export async function listScaffoldedRecords(
  resource: string,
  params: { keyword?: string; status?: string; cursor?: string | null; limit?: number } = {},
) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.cursor) query.set('cursor', params.cursor)
  query.set('limit', String(params.limit ?? 20))
  return request<ScaffoldedPage>(`${resource}?${query.toString()}`)
}

export async function createScaffoldedRecord(resource: string, payload: Record<string, unknown>) {
  return request<ScaffoldedRecord>(resource, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateScaffoldedRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return actOnScaffoldedRecord(resource, id, 'update', payload)
}

export async function actOnScaffoldedRecord(
  resource: string,
  id: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  return request<ScaffoldedRecord>(`${resource}/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  })
}

export async function exportScaffoldedRecords(resource: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  const response = await fetch(`/api/management/${resource}/export?${query.toString()}`, {
    headers: { Accept: 'text/csv' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new ManagementApiError(response.status, 'E_PROVIDER_UNAVAILABLE', '导出失败，请稍后重试', null, null)
  }
  return response.blob()
}

export async function getHomeStats() {
  return request<HomeStatsResponse>('management/home/stats')
}

export async function saveHomeStats(items: Array<{ label: string; value: string }>) {
  return request<HomeStatsResponse>('management/home/stats', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export async function listHomeSection(
  sectionKey: string,
  params: {
    keyword?: string
    homeOnly?: boolean
    cursor?: string | null
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.homeOnly !== undefined) query.set('home_only', String(params.homeOnly))
  if (params.cursor) query.set('cursor', params.cursor)
  query.set('limit', String(params.limit ?? 20))
  return request<ScaffoldedPage>(
    `management/home/sections/${encodeURIComponent(sectionKey)}?${query.toString()}`,
  )
}

export async function actOnHomeSectionItem(sectionKey: string, id: string, action: string) {
  return request<ScaffoldedRecord>(
    `management/home/sections/${encodeURIComponent(sectionKey)}/${encodeURIComponent(id)}/action`,
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    },
  )
}

export async function reorderHomeSection(sectionKey: string, orderedIds: string[]) {
  return request<ScaffoldedPage>(
    `management/home/sections/${encodeURIComponent(sectionKey)}/action`,
    {
      method: 'POST',
      body: JSON.stringify({ action: 'reorder', ordered_ids: orderedIds }),
    },
  )
}

export async function updateManagementProfile(accountId: string, displayName: string) {
  return request<ScaffoldedRecord>('management/me/action', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_profile',
      account_id: accountId,
      display_name: displayName,
    }),
  })
}

export async function changeManagementPassword(newPassword: string, confirmationToken: string) {
  return request<ScaffoldedRecord>('auth/password/set', {
    method: 'POST',
    body: JSON.stringify({
      new_password: newPassword,
      confirmation_token: confirmationToken,
    }),
  })
}
