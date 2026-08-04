import { ManagementApiError } from './management'
import { randomUuid } from '@/lib/random-id'

type JsonRecord = Record<string, unknown>

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
  version?: number
  raw?: JsonRecord
}

export interface ScaffoldedPage {
  items: ScaffoldedRecord[]
  next_cursor: string | null
  has_more?: boolean
}

export interface HomeStatRow {
  id: string
  label: string
  value: string
}

export interface HomeStatsResponse {
  items: HomeStatRow[]
  version?: number
}

export interface HomeBannerRow {
  id: string
  title: string
  subtitle: string
  media_url: string
  media_access_url: string
  link_url: string
}

export interface ManagementMediaUpload {
  media_url: string
  access_url: string
}

export interface ManagementAuditRecord {
  id: string
  sequence: number
  occurred_at: string
  actor_account_id: string | null
  actor_display_name: string
  enterprise_id: string | null
  object_type: string
  object_id: string
  action: string
  request_id: string | null
  reason_code: string | null
  metadata: JsonRecord
}

export interface ManagementAuditOperator {
  account_id: string
  display_name: string
}

export interface SiteConfigResponse {
  section: 'basic' | 'seo' | 'contact' | 'social'
  payload: JsonRecord
}

interface ModuleRoute {
  path: string
  query?: Record<string, string>
  kind:
    | 'article'
    | 'cms-category'
    | 'product'
    | 'product-category'
    | 'activity'
    | 'chamber'
    | 'inquiry'
    | 'partner'
    | 'country'
    | 'account'
    | 'plan'
}

const liveModules: Record<string, ModuleRoute> = {
  news: { path: 'management/cms/articles', query: { contentType: 'news' }, kind: 'article' },
  investment: { path: 'management/cms/articles', query: { contentType: 'invest' }, kind: 'article' },
  associations: { path: 'management/cms/articles', query: { contentType: 'association' }, kind: 'article' },
  parks: { path: 'management/cms/articles', query: { contentType: 'park' }, kind: 'article' },
  'article-categories': {
    path: 'management/cms/categories',
    query: { contentType: 'news' },
    kind: 'cms-category',
  },
  tour: { path: 'management/products', query: { type: 'tour' }, kind: 'product' },
  education: { path: 'management/products', query: { type: 'edu' }, kind: 'product' },
  'supply-chain': { path: 'management/products', query: { type: 'goods' }, kind: 'product' },
  activities: {
    path: 'management/cms/articles',
    query: { contentType: 'activity' },
    kind: 'article',
  },
  chambers: { path: 'management/chambers', kind: 'chamber' },
  inquiries: { path: 'management/inquiries', kind: 'inquiry' },
  partners: { path: 'management/portal/partners', kind: 'partner' },
  'product-categories': { path: 'management/product-categories', kind: 'product-category' },
  countries: { path: 'management/portal/countries', kind: 'country' },
  accounts: { path: 'management/accounts', kind: 'account' },
  plans: { path: 'management/plans', kind: 'plan' },
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
  return `idem_${randomUuid().replaceAll('-', '')}`
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

  const response = await fetch(`/api/${path}`, {
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

function moduleFromResource(resource: string) {
  const match = /^management\/legacy\/([a-z0-9-]+)$/.exec(resource)
  return match ? match[1] : null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined
}

function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
}

async function getPortalConfig(key: string) {
  return request<unknown>(`management/portal/site-config/${encodeURIComponent(key)}`)
}

export type ManagementCountryOption = {
  code: string
  name: string
}

export async function listManagementCountryOptions(): Promise<ManagementCountryOption[]> {
  const result = pageItems(await request<unknown>('public/portal/countries?limit=100'))
  return result.items
    .filter((item) => Number(item.status) === 1 && typeof item.code === 'string')
    .map((item) => ({
      code: String(item.code).toUpperCase(),
      name: String(item.name ?? item.code),
    }))
}

async function savePortalConfig(key: string, value: unknown, remark: string) {
  await request<void>(`management/portal/site-config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, remark }),
  })
}

async function getPortalHome() {
  const sections = await getPortalConfig('sections')
  return { sections: Array.isArray(sections) ? sections : [] } satisfies JsonRecord
}

function recordFromDto(dto: JsonRecord, route: ModuleRoute): ScaffoldedRecord {
  dto.category_id ??= dto.categoryId
  dto.category_name ??= dto.categoryName
  dto.content_type ??= dto.contentType
  dto.enterprise_id ??= dto.enterpriseId
  dto.enterprise_name ??= dto.enterpriseName
  dto.is_top ??= dto.isTop
  dto.is_home ??= dto.isHome
  if (dto.is_top !== undefined) dto.is_top = dto.is_top === true || Number(dto.is_top) === 1
  if (dto.is_home !== undefined) dto.is_home = dto.is_home === true || Number(dto.is_home) === 1
  dto.created_at ??= dto.createdAt
  dto.updated_at ??= dto.updatedAt
  dto.name_en ??= dto.nameEn
  dto.image_urls ??= dto.images
  const id = String(
    dto.id
      ?? (route.kind === 'chamber' ? dto.enterprise_id : undefined)
      ?? '',
  )
  const title = String(
    dto.title
      ?? dto.name
      ?? dto.contact_name
      ?? dto.display_name
      ?? dto.legal_name
      ?? dto.code
      ?? id,
  )
  let status = String(dto.status ?? dto.lifecycle_status ?? 'active')
  if (route.kind === 'article') status = ({ 0: 'draft', 1: 'published', 2: 'archived' } as Record<number, string>)[Number(dto.status)] ?? status
  if (route.kind === 'product') status = ({ 0: 'draft', 1: 'published', 2: 'disabled' } as Record<number, string>)[Number(dto.status)] ?? status
  if (['cms-category', 'product-category', 'partner', 'country'].includes(route.kind)) {
    status = Number(dto.status) === 1 ? 'active' : 'inactive'
  }
  if (route.kind === 'inquiry') {
    status = ({ 0: 'pending', 1: 'processing', 2: 'completed', 3: 'invalid' } as Record<number, string>)[Number(dto.status)] ?? status
  }
  if (route.kind === 'activity') status = String(dto.status ?? dto.registration_availability ?? status)
  if (route.kind === 'chamber') status = Number(dto.status) === 1 ? 'active' : 'inactive'

  const subtitle = asString(
    dto.subtitle
      ?? dto.enterprise_name
      ?? dto.name_en
      ?? dto.masked_phone
      ?? dto.contact
      ?? dto.message,
  )
  const nestedEnterprise = dto.enterprise && typeof dto.enterprise === 'object' && !Array.isArray(dto.enterprise)
    ? dto.enterprise as JsonRecord
    : null
  const category = asString(
    dto.category_name
      ?? dto.category
      ?? dto.kind
      ?? dto.content_type
      ?? dto.direction
      ?? dto.role_template
      ?? nestedEnterprise?.display_name,
  )

  return {
    id,
    title,
    subtitle,
    cover_url: asString(dto.cover_access_url ?? dto.cover ?? dto.logo_access_url ?? dto.logo ?? dto.flag),
    category,
    country: asString(dto.country ?? dto.country_code ?? dto.code),
    status,
    sort: asNumber(dto.sort ?? dto.sort_order),
    is_home: typeof dto.is_home === 'boolean' ? dto.is_home : Number(dto.is_home) === 1,
    created_at: asString(dto.created_at) ?? undefined,
    updated_at: asString(dto.updated_at) ?? undefined,
    version: asNumber(dto.version),
    raw: dto,
  }
}

function pageItems(body: unknown): { items: JsonRecord[]; nextCursor: string | null; hasMore: boolean } {
  const value = body && typeof body === 'object' ? body as JsonRecord : {}
  const items = Array.isArray(value.items) ? value.items.filter((item): item is JsonRecord => (
    Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  )) : []
  const page = value.page && typeof value.page === 'object' ? value.page as JsonRecord : {}
  const pageNumber = asNumber(value.page)
  const pageSize = asNumber(value.size)
  const total = asNumber(value.total)
  const pageHasMore = pageNumber !== undefined && pageSize !== undefined && total !== undefined
    ? pageNumber * pageSize < total
    : false
  return {
    items,
    nextCursor: asString(value.next_cursor ?? page.next_cursor) ?? (pageHasMore ? String(pageNumber! + 1) : null),
    hasMore: value.has_more === true || page.has_more === true || pageHasMore,
  }
}

function toQuery(route: ModuleRoute, params: {
  keyword?: string
  status?: string
  cursor?: string | null
  limit?: number
}) {
  const query = new URLSearchParams(route.query)
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.status && params.status !== 'all') {
    const key = 'status'
    query.set(
      key,
      route.kind === 'chamber'
        ? params.status === 'active' ? '1' : '0'
        : route.kind === 'inquiry'
          ? String(({ pending: 0, processing: 1, completed: 2, invalid: 3 } as Record<string, number>)[params.status])
          : ['cms-category', 'product-category', 'partner', 'country'].includes(route.kind)
            ? params.status === 'active' ? '1' : '0'
            : route.kind === 'article'
              ? String(({ draft: 0, published: 1, archived: 2 } as Record<string, number>)[params.status])
              : route.kind === 'product'
                ? String(({ draft: 0, published: 1, disabled: 2 } as Record<string, number>)[params.status])
          : params.status,
    )
  }
  const pageBased = ['article', 'cms-category', 'product', 'product-category', 'inquiry', 'chamber'].includes(route.kind)
  if (pageBased) {
    query.set('page', params.cursor ?? '1')
    query.set('size', String(params.limit ?? 20))
  } else {
    if (params.cursor) query.set('cursor', params.cursor)
    query.set('limit', String(params.limit ?? 20))
  }
  return query
}

export async function listScaffoldedRecords(
  resource: string,
  params: { keyword?: string; status?: string; cursor?: string | null; limit?: number } = {},
) {
  const module = moduleFromResource(resource)
  if (!module) {
    const query = new URLSearchParams()
    if (params.keyword) query.set('keyword', params.keyword)
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.cursor) query.set('cursor', params.cursor)
    query.set('limit', String(params.limit ?? 20))
    return request<ScaffoldedPage>(`${resource}?${query.toString()}`)
  }

  const route = liveModules[module]
  if (!route) {
    throw new ManagementApiError(404, 'E_RESOURCE_NOT_FOUND', '该管理模块尚未开放真实接口', null, null)
  }
  const result = pageItems(await request<unknown>(`${route.path}?${toQuery(route, params).toString()}`))
  return {
    items: result.items.map((item) => recordFromDto(item, route)),
    next_cursor: result.nextCursor,
    has_more: result.hasMore,
  }
}

export async function listCmsCategoryOptions(resource: string) {
  const module = moduleFromResource(resource)
  const contentType = module ? liveModules[module]?.query?.contentType : null
  if (!contentType) return []
  const query = new URLSearchParams({ contentType, status: '1', page: '1', size: '100' })
  const route: ModuleRoute = {
    path: 'management/cms/categories',
    query: { contentType },
    kind: 'cms-category',
  }
  const result = pageItems(await request<unknown>(`management/cms/categories?${query.toString()}`))
  return result.items.map((item) => recordFromDto(item, route))
}

function articlePayload(module: string, payload: JsonRecord) {
  const contentType = liveModules[module]?.query?.contentType ?? 'news'
  return {
    content_type: contentType,
    category_id: payload.category_id || null,
    title: String(payload.title ?? ''),
    subtitle: payload.subtitle || null,
    summary: payload.summary || null,
    content: payload.content || '',
    country: payload.country || null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    source: payload.source || null,
    cover: payload.cover_url || null,
    images: Array.isArray(payload.image_urls) ? payload.image_urls : [],
    sort: Number(payload.sort ?? 0),
    is_top: payload.is_top === true ? 1 : 0,
    is_home: payload.is_home === true ? 1 : 0,
    status: payload.status === 'published' ? 1 : payload.status === 'archived' ? 2 : 0,
  }
}

function createPayload(module: string, payload: JsonRecord) {
  const route = liveModules[module]
  if (route.kind === 'article') return articlePayload(module, payload)
  if (route.kind === 'cms-category') {
    return {
      content_type: route.query?.contentType ?? 'news',
      name: String(payload.title ?? ''),
      slug: String(payload.link ?? payload.title ?? '').trim().toLowerCase().replace(/\s+/g, '-'),
      parent_id: payload.parent_id || null,
      sort: Number(payload.sort ?? 0),
      status: payload.status === 'inactive' ? 0 : 1,
    }
  }
  if (route.kind === 'product-category') {
    return {
      type: 'goods',
      name: String(payload.title ?? ''),
      slug: String(payload.link ?? payload.title ?? '').trim().toLowerCase().replace(/\s+/g, '-'),
      sort: Number(payload.sort ?? 0),
      status: payload.status === 'inactive' ? 0 : 1,
    }
  }
  if (route.kind === 'partner') {
    return {
      name: String(payload.title ?? ''),
      logo: String(payload.logo_url ?? ''),
      link: payload.link || null,
      category: payload.partner_category || 'enterprise',
      sort: Number(payload.sort ?? 0),
      is_home: payload.is_featured === true ? 1 : 0,
      status: payload.status === 'inactive' ? 0 : 1,
    }
  }
  if (route.kind === 'country') {
    return {
      code: String(payload.country ?? '').toUpperCase(),
      name: String(payload.title ?? ''),
      name_en: String(payload.subtitle ?? ''),
      flag: payload.link || null,
      sort: Number(payload.sort ?? 0),
      status: payload.status === 'inactive' ? 0 : 1,
    }
  }
  if (route.kind === 'chamber') {
    return {
      name: String(payload.title ?? ''),
      name_en: payload.subtitle || null,
      country_code: String(payload.country ?? '').toUpperCase(),
      logo: payload.logo_url || null,
      description: String(payload.introduction ?? ''),
      founded_at: payload.founded_on || null,
      reg_place: payload.registered_place || null,
      address: payload.address || null,
      contact_phone: payload.contact_phone || null,
      contact_email: payload.contact_email || null,
      website_url: payload.website_url || null,
      sort: Number(payload.sort ?? 0),
      is_home: payload.is_featured === true ? 1 : 0,
      status: payload.status === 'inactive' ? 0 : 1,
    }
  }
  throw new ManagementApiError(422, 'E_INPUT_INVALID', '当前模块不支持在管理端新建', null, null)
}

export async function createScaffoldedRecord(resource: string, payload: JsonRecord) {
  const module = moduleFromResource(resource)
  if (!module) {
    return request<ScaffoldedRecord>(resource, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
  const route = liveModules[module]
  if (!route) throw new ManagementApiError(404, 'E_RESOURCE_NOT_FOUND', '管理模块不存在', null, null)
  const result = await request<JsonRecord>(route.path, {
    method: 'POST',
    body: JSON.stringify(createPayload(module, payload)),
  })
  return recordFromDto(result, route)
}

export async function updateScaffoldedRecord(
  resource: string,
  id: string,
  payload: JsonRecord,
) {
  return actOnScaffoldedRecord(resource, id, 'update', payload)
}

function updateAction(module: string, item: ScaffoldedRecord | undefined, payload: JsonRecord) {
  const route = liveModules[module]
  const version = Number(payload.expected_version ?? item?.version ?? 0)
  if (route.kind === 'article') return articlePayload(module, payload)
  if (route.kind === 'cms-category') {
    return {
      action: 'update',
      expected_version: version,
      name: payload.title,
      slug: payload.link,
      parent_id: payload.parent_id || null,
      sort_order: Number(payload.sort ?? 0),
    }
  }
  if (route.kind === 'product-category') {
    return {
      action: 'update',
      expected_version: version,
      name: payload.title,
      slug: payload.link,
      parent_id: payload.parent_id || null,
      sort_order: Number(payload.sort ?? 0),
    }
  }
  if (route.kind === 'partner') {
    return {
      action: 'update',
      expected_version: version,
      name: payload.title,
      logo_url: payload.logo_url,
      website_url: payload.link || null,
      category: payload.partner_category,
      sort_order: Number(payload.sort ?? 0),
    }
  }
  if (route.kind === 'country') {
    return {
      action: 'update',
      expected_version: version,
      name_zh: payload.title,
      name_en: payload.subtitle,
      flag_url: payload.link || null,
      sort_order: Number(payload.sort ?? 0),
    }
  }
  return { action: 'update', expected_version: version, ...payload }
}

function statusAction(route: ModuleRoute, action: string, version: number, payload: JsonRecord = {}) {
  if (route.kind === 'article') {
    return action === 'enable'
      ? { action: 'publish', expected_version: version }
      : { action: 'withdraw', expected_version: version, reason: '管理端下架' }
  }
  if (route.kind === 'cms-category' || route.kind === 'product-category') {
    return { action: 'set_status', expected_version: version, status: action === 'enable' ? 'active' : 'inactive' }
  }
  if (route.kind === 'partner' || route.kind === 'country') {
    return { action: action === 'enable' ? 'activate' : 'deactivate', expected_version: version }
  }
  if (route.kind === 'chamber') {
    if (action === 'enable') return { action: 'publish', expected_version: version }
    if (action === 'disable') {
      return {
        action: 'unpublish',
        expected_version: version,
        reason: payload.reason || '管理端撤回',
      }
    }
    if (action === 'suspend' || action === 'close') {
      return {
        action,
        expected_version: version,
        reason: payload.reason,
      }
    }
    if (action === 'restore') return { action, expected_version: version }
  }
  return { action, expected_version: version }
}

export async function actOnScaffoldedRecord(
  resource: string,
  id: string,
  action: string,
  payload: JsonRecord = {},
) {
  const module = moduleFromResource(resource)
  if (!module) {
    return request<ScaffoldedRecord>(`${resource}/${encodeURIComponent(id)}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    })
  }
  const route = liveModules[module]
  if (!route) throw new ManagementApiError(404, 'E_RESOURCE_NOT_FOUND', '管理模块不存在', null, null)
  const existing = payload.__item as ScaffoldedRecord | undefined
  const cleanPayload = { ...payload }
  delete cleanPayload.__item
  const version = Number(cleanPayload.expected_version ?? existing?.version ?? 0)

  if (route.kind === 'inquiry') {
    const status = ({ pending: 0, processing: 1, completed: 2, invalid: 3 } as Record<string, number>)[String(cleanPayload.status)]
    const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}/handle`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        remark: cleanPayload.follow_up_note || null,
      }),
    })
    return recordFromDto(result, route)
  }

  if (route.kind === 'article') {
    if (action === 'enable') {
      const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}/publish`, {
        method: 'POST',
      })
      return recordFromDto(result, route)
    }
    const source = action === 'update'
      ? cleanPayload
      : await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`)
    const body = action === 'update'
      ? articlePayload(module, source)
      : articlePayload(module, {
          title: source.title,
          subtitle: source.subtitle,
          summary: source.summary,
          content: source.content,
          country: source.country,
          tags: source.tags,
          source: source.source,
          category_id: source.category_id ?? source.categoryId,
          cover_url: source.cover,
          image_urls: source.images,
          sort: source.sort,
          is_top: source.is_top ?? source.isTop,
          is_home: source.is_home ?? source.isHome,
          status: action === 'disable' ? 'draft' : source.status,
        })
    const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return recordFromDto(result, route)
  }

  if (['cms-category', 'product-category', 'partner', 'country'].includes(route.kind)) {
    const current = existing?.raw ?? {}
    const nextStatus = action === 'enable' ? 1 : action === 'disable' ? 0 : undefined
    let body: JsonRecord
    if (action === 'update') {
      body = createPayload(module, cleanPayload)
    } else if (route.kind === 'cms-category') {
      body = {
        content_type: current.content_type ?? current.contentType,
        name: current.name,
        parent_id: current.parent_id ?? current.parentId ?? null,
        slug: current.slug ?? null,
        sort: current.sort ?? 0,
        status: nextStatus ?? current.status,
      }
    } else if (route.kind === 'product-category') {
      body = {
        type: current.type,
        name: current.name,
        slug: current.slug ?? null,
        sort: current.sort ?? 0,
        status: nextStatus ?? current.status,
      }
    } else if (route.kind === 'partner') {
      body = {
        name: current.name,
        logo: current.logo,
        link: current.link ?? null,
        category: current.category ?? 'enterprise',
        sort: current.sort ?? 0,
        is_home: current.is_home ?? current.isHome ?? 0,
        status: nextStatus ?? current.status,
      }
    } else {
      body = {
        name: current.name,
        name_en: current.name_en ?? current.nameEn ?? null,
        code: current.code ?? null,
        flag: current.flag ?? null,
        sort: current.sort ?? 0,
        status: nextStatus ?? current.status,
      }
    }
    const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return recordFromDto(result, route)
  }

  if (route.kind === 'chamber' && action === 'update') {
    const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(createPayload(module, cleanPayload)),
    })
    return recordFromDto(result, route)
  }

  if (route.kind === 'chamber' && ['enable', 'disable', 'restore'].includes(action)) {
    const current = existing?.raw ?? {}
    const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: current.name ?? existing?.title ?? '',
        name_en: current.name_en ?? null,
        country_code: current.country_code ?? existing?.country ?? 'CN',
        logo: current.logo ?? null,
        description: current.description ?? null,
        founded_at: current.founded_at ?? null,
        reg_place: current.reg_place ?? null,
        address: current.address ?? null,
        contact_phone: current.contact_phone ?? null,
        contact_email: current.contact_email ?? null,
        website_url: current.website_url ?? null,
        sort: current.sort ?? existing?.sort ?? 0,
        is_home: current.is_home ?? 0,
        status: action === 'disable' ? 0 : 1,
      }),
    })
    return recordFromDto(result, route)
  }

  const body = action === 'update'
    ? updateAction(module, existing, cleanPayload)
    : statusAction(route, action, version, cleanPayload)
  const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return recordFromDto(result, route)
}

export async function exportScaffoldedRecords(resource: string, params: Record<string, string> = {}) {
  const module = moduleFromResource(resource)
  const path = module === 'inquiries' ? 'management/inquiries/export' : `${resource}/export`
  const query = new URLSearchParams(params)
  const response = await fetch(`/api/${path}?${query.toString()}`, {
    headers: { Accept: 'text/csv' },
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new ManagementApiError(response.status, 'E_PROVIDER_UNAVAILABLE', '导出失败，请稍后重试', null, null)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `huameng-export-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
  return blob
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const SMALL_UPLOAD_MAX_BYTES = 5 * 1024 * 1024

async function uploadSmallManagementMedia(
  file: File,
  purpose: 'cms' | 'product' | 'enterprise' | 'chamber' | 'profile',
) {
  const query = new URLSearchParams({ purpose, filename: file.name })
  const response = await fetch(`/api/management/media/uploads/content?${query}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': file.type || 'application/octet-stream',
      'X-Management-CSRF': csrfToken(),
      'Idempotency-Key': idempotencyKey(),
    },
    credentials: 'same-origin',
    cache: 'no-store',
    body: file,
  })
  const body = await response.json().catch(() => null) as JsonRecord | null
  if (!response.ok) {
    const envelope = body?.error && typeof body.error === 'object' ? body.error as JsonRecord : null
    throw new ManagementApiError(
      response.status,
      asString(envelope?.code) ?? 'E_PROVIDER_UNAVAILABLE',
      asString(envelope?.message) ?? `上传 ${file.name} 失败`,
      asString(envelope?.hint),
      asString(body?.request_id),
    )
  }
  return body ?? {}
}

async function uploadMultipartParts(file: File, upload: JsonRecord) {
  const multipart = upload.multipart && typeof upload.multipart === 'object'
    ? upload.multipart as JsonRecord
    : null
  const partSize = Number(multipart?.part_size ?? 0)
  const parts = Array.isArray(multipart?.parts)
    ? multipart.parts.filter((part): part is JsonRecord => Boolean(part) && typeof part === 'object')
    : []
  if (partSize < 100 * 1024 || parts.length === 0) {
    throw new ManagementApiError(502, 'E_PROVIDER_UNAVAILABLE', '服务端未返回有效的 OSS 分片参数', null, null)
  }

  const completed: Array<{ part_number: number; etag: string }> = new Array(parts.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < parts.length) {
      const index = nextIndex++
      const part = parts[index]
      const partNumber = Number(part.part_number)
      const uploadUrl = asString(part.upload_url)
      if (!uploadUrl || !Number.isInteger(partNumber)) {
        throw new ManagementApiError(502, 'E_PROVIDER_UNAVAILABLE', 'OSS 分片参数不完整', null, null)
      }
      const offset = (partNumber - 1) * partSize
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file.slice(offset, Math.min(offset + partSize, file.size)),
      })
      const etag = response.headers.get('ETag')?.replaceAll('"', '').trim()
      if (!response.ok || !etag) {
        throw new ManagementApiError(
          response.status,
          'E_PROVIDER_UNAVAILABLE',
          `上传 ${file.name} 的第 ${partNumber} 个分片失败`,
          !etag ? '请确认 OSS CORS 已暴露 ETag 响应头' : null,
          null,
        )
      }
      completed[index] = { part_number: partNumber, etag }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, parts.length) }, () => worker()))
  return completed.sort((left, right) => left.part_number - right.part_number)
}

export async function uploadManagementMedia(
  file: File,
  purpose: 'cms' | 'product' | 'enterprise' | 'chamber' | 'profile' = 'cms',
) {
  if (file.size <= SMALL_UPLOAD_MAX_BYTES) {
    const uploaded = await uploadSmallManagementMedia(file, purpose)
    return managementMediaUpload(uploaded)
  }
  const sha256 = bytesToHex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))
  const upload = await request<JsonRecord>('management/media/uploads', {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      sha256,
    }),
  })
  const parts = await uploadMultipartParts(file, upload)
  const completed = await request<JsonRecord>(
    `management/media/uploads/${encodeURIComponent(String(upload.id))}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ expected_version: Number(upload.version ?? 1), parts }),
    },
  )
  return managementMediaUpload({ ...upload, ...completed })
}

function managementMediaUpload(value: JsonRecord): ManagementMediaUpload {
  const mediaUrl = asString(value.media_url) ?? ''
  if (!mediaUrl) {
    throw new ManagementApiError(
      502,
      'E_PROVIDER_UNAVAILABLE',
      '上传服务未返回持久化媒体地址',
      null,
      null,
    )
  }
  const accessUrl = asString(value.access_url)
    ?? (/^https?:\/\//i.test(mediaUrl) ? mediaUrl : '')
  return { media_url: mediaUrl, access_url: accessUrl }
}

export async function getHomeStats() {
  const value = await getPortalConfig('stats')
  const stats = Array.isArray(value) ? value : []
  return {
    items: stats.map((item, index) => {
      const row = item && typeof item === 'object' ? item as JsonRecord : {}
      return {
        id: String(row.id ?? `stat-${index}`),
        label: String(row.label ?? ''),
        value: String(row.value ?? ''),
      }
    }),
  }
}

export async function getHomeBanners() {
  const value = await getPortalConfig('banners')
  const banners = Array.isArray(value) ? value : []
  return {
    items: banners.map((item, index) => {
      const row = item && typeof item === 'object' ? item as JsonRecord : {}
      return {
        id: `banner-${index}`,
        title: String(row.title ?? ''),
        subtitle: String(row.subtitle ?? ''),
        media_url: String(row.media_url ?? ''),
        media_access_url: String(row.media_access_url ?? ''),
        link_url: String(row.link_url ?? ''),
      }
    }),
  }
}

export async function saveHomeBanners(items: HomeBannerRow[]) {
  const banners = items.map((item) => ({
    title: item.title,
    subtitle: item.subtitle || null,
    media_url: item.media_url,
    link_url: item.link_url || null,
  }))
  await savePortalConfig('banners', banners, '首页轮播图')
  return { items }
}

export async function saveHomeStats(items: Array<{ label: string; value: string }>) {
  await savePortalConfig('stats', items, '首页统计数字')
  return {
    items: items.map((item, index) => ({
      id: `stat-${index}`,
      label: item.label,
      value: item.value,
    })),
  }
}

const homeSectionRoutes: Record<string, ModuleRoute> = {
  news: liveModules.news,
  tour: liveModules.tour,
  education: liveModules.education,
  trade: liveModules.investment,
  supply: liveModules['supply-chain'],
  association: liveModules.associations,
  activity: {
    path: 'management/cms/articles',
    query: { contentType: 'activity' },
    kind: 'article',
  },
  park: liveModules.parks,
  partners: liveModules.partners,
  chambers: liveModules.chambers,
}

const homeSectionTitles: Record<string, string> = {
  news: '新闻中心',
  tour: '文化旅游',
  education: '教育交流',
  trade: '经贸合作',
  supply: '供应链平台',
  association: '商协会',
  activity: '近期活动',
  park: '东盟园区',
  partners: '合作伙伴',
  chambers: '推荐商会',
}

function homeResourceType(route: ModuleRoute) {
  if (route.kind === 'product') return 'product'
  if (route.kind === 'partner') return 'partner'
  if (route.kind === 'chamber') return 'chamber'
  return 'cms_article'
}

function homeSections(home: JsonRecord) {
  return Array.isArray(home.sections)
    ? home.sections.filter((item): item is JsonRecord => Boolean(item) && typeof item === 'object')
    : []
}

async function saveHomeSections(home: JsonRecord, sections: JsonRecord[]) {
  void home
  await savePortalConfig('sections', sections, '首页内容楼层')
}

export async function listHomeSection(
  sectionKey: string,
  params: { keyword?: string; homeOnly?: boolean; cursor?: string | null; limit?: number } = {},
) {
  const route = homeSectionRoutes[sectionKey]
  if (!route) return { items: [], next_cursor: null, has_more: false }
  if (!params.homeOnly) {
    const query = toQuery(route, {
      keyword: params.keyword,
      status: 'all',
      cursor: params.cursor,
      limit: params.limit,
    })
    const result = await request<JsonRecord>(`${route.path}?${query.toString()}`)
    const page = pageItems(result)
    return {
      items: page.items.map((item) => recordFromDto(item, route)),
      next_cursor: page.nextCursor,
      has_more: page.hasMore,
    }
  }

  const home = await getPortalHome()
  const section = homeSections(home).find((item) => item.key === sectionKey)
  const references = Array.isArray(section?.items)
    ? section.items.filter((item): item is JsonRecord => Boolean(item) && typeof item === 'object')
    : []

  if (route.kind === 'partner') {
    const listed = pageItems(await request<unknown>(`${route.path}?limit=100`))
    const byId = new Map(
      listed.items.map((item) => {
        const record = recordFromDto(item, route)
        return [record.id, record] as const
      }),
    )
    return {
      items: references.flatMap((reference) => {
        const id = asString(reference.resource_id)
        const record = id ? byId.get(id) : null
        return record ? [{ ...record, is_home: true }] : []
      }),
      next_cursor: null,
      has_more: false,
    }
  }

  const items = await Promise.all(references.map(async (reference) => {
    const id = asString(reference.resource_id)
    if (!id) return null
    try {
      const dto = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`)
      return { ...recordFromDto(dto, route), is_home: true }
    } catch {
      return {
        id,
        title: `资源 ${id}`,
        subtitle: '源内容暂时不可读取',
        status: 'unavailable',
        is_home: true,
      } satisfies ScaffoldedRecord
    }
  }))
  return {
    items: items.filter(Boolean) as ScaffoldedRecord[],
    next_cursor: null,
    has_more: false,
  }
}

export async function actOnHomeSectionItem(sectionKey: string, id: string, action: string) {
  const route = homeSectionRoutes[sectionKey]
  if (!route) throw new ManagementApiError(404, 'E_RESOURCE_NOT_FOUND', '首页分区不存在', null, null)
  const home = await getPortalHome()
  const sections = homeSections(home)
  const current = sections.find((item) => item.key === sectionKey)
  const currentItems = Array.isArray(current?.items)
    ? current.items.filter((item): item is JsonRecord => Boolean(item) && typeof item === 'object')
    : []
  const nextItems = action === 'remove_from_home'
    ? currentItems.filter((item) => item.resource_id !== id)
    : currentItems.some((item) => item.resource_id === id)
      ? currentItems
      : [...currentItems, { resource_type: homeResourceType(route), resource_id: id }]
  const nextSection = {
    key: sectionKey,
    title: asString(current?.title) ?? homeSectionTitles[sectionKey] ?? sectionKey,
    items: nextItems,
  }
  await saveHomeSections(
    home,
    sections.some((item) => item.key === sectionKey)
      ? sections.map((item) => item.key === sectionKey ? nextSection : item)
      : [...sections, nextSection],
  )
  const result = await request<JsonRecord>(`${route.path}/${encodeURIComponent(id)}`)
  return {
    ...recordFromDto(result, route),
    is_home: action !== 'remove_from_home',
  }
}

export async function reorderHomeSection(sectionKey: string, orderedIds: string[]) {
  const route = homeSectionRoutes[sectionKey]
  if (!route) throw new ManagementApiError(404, 'E_RESOURCE_NOT_FOUND', '首页分区不存在', null, null)
  const home = await getPortalHome()
  const sections = homeSections(home)
  const current = sections.find((item) => item.key === sectionKey)
  const nextSection = {
    key: sectionKey,
    title: asString(current?.title) ?? homeSectionTitles[sectionKey] ?? sectionKey,
    items: orderedIds.map((id) => ({
      resource_type: homeResourceType(route),
      resource_id: id,
    })),
  }
  await saveHomeSections(
    home,
    sections.some((item) => item.key === sectionKey)
      ? sections.map((item) => item.key === sectionKey ? nextSection : item)
      : [...sections, nextSection],
  )
  return listHomeSection(sectionKey, { homeOnly: true })
}

export async function getManagementAccount() {
  return request<JsonRecord>('management/account')
}

export async function updateManagementProfile(_accountId: string, displayName: string) {
  return request<JsonRecord>('management/account/action', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_profile', display_name: displayName }),
  })
}

export async function changeManagementPassword(newPassword: string, confirmationToken: string) {
  return request<void>('auth/management/password/set', {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword, confirmation_token: confirmationToken }),
  })
}

export async function getSiteConfig(section: SiteConfigResponse['section']) {
  const value = await request<unknown>(`management/portal/site-config/${section}`)
  return { section, payload: asJsonRecord(value) } satisfies SiteConfigResponse
}

export function updateSiteConfig(
  section: SiteConfigResponse['section'],
  payload: JsonRecord,
  _expectedVersion?: number,
) {
  return request<void>(`management/portal/site-config/${section}`, {
    method: 'PUT',
    body: JSON.stringify({ value: payload, remark: `站点配置：${section}` }),
  }).then(() => ({ section, payload }))
}

function auditQuery(input: {
  scopeType: 'platform' | 'country' | 'chamber' | 'enterprise'
  scopeId: string
  objectType?: string
  actionPrefix?: string
  actorAccountId?: string
  keyword?: string
  start?: string
  end?: string
  cursor?: string | null
  limit?: number
}) {
  const query = new URLSearchParams({
    scope_type: input.scopeType,
    scope_id: input.scopeId,
    sort: 'occurred_at_desc',
    limit: String(input.limit ?? 50),
  })
  if (input.objectType) query.set('object_type', input.objectType)
  if (input.actionPrefix) query.set('action_prefix', input.actionPrefix)
  if (input.actorAccountId) query.set('actor_account_id', input.actorAccountId)
  if (input.keyword) query.set('keyword', input.keyword)
  if (input.start) query.set('start', input.start)
  if (input.end) query.set('end', input.end)
  if (input.cursor) query.set('cursor', input.cursor)
  return query
}

export async function listManagementAudit(input: Parameters<typeof auditQuery>[0]) {
  const result = await request<{ items: ManagementAuditRecord[]; next_cursor?: string | null }>(
    `management/audit-logs?${auditQuery(input).toString()}`,
  )
  return {
    items: Array.isArray(result.items) ? result.items : [],
    next_cursor: result.next_cursor ?? null,
  }
}

export function listManagementAuditActionTypes(input: {
  scopeType: 'platform' | 'country' | 'chamber' | 'enterprise'
  scopeId: string
}) {
  const query = new URLSearchParams({ scope_type: input.scopeType, scope_id: input.scopeId })
  return request<string[]>(`management/audit-logs/action-types?${query.toString()}`)
}

export function listManagementAuditOperators(input: {
  scopeType: 'platform' | 'country' | 'chamber' | 'enterprise'
  scopeId: string
}) {
  const query = new URLSearchParams({ scope_type: input.scopeType, scope_id: input.scopeId })
  return request<ManagementAuditOperator[]>(`management/audit-logs/operators?${query.toString()}`)
}

export async function exportManagementAudit(input: Parameters<typeof auditQuery>[0]) {
  const response = await fetch('/api/management/audit-logs/export', {
    method: 'POST',
    headers: {
      Accept: 'text/csv, application/json',
      'Content-Type': 'application/json',
      'X-Management-CSRF': csrfToken(),
      'Idempotency-Key': idempotencyKey(),
    },
    body: JSON.stringify({
      scope_type: input.scopeType,
      scope_id: input.scopeId,
      object_type: input.objectType || null,
      action_prefix: input.actionPrefix || null,
      actor_account_id: input.actorAccountId || null,
      keyword: input.keyword || null,
      start: input.start || null,
      end: input.end || null,
    }),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {
      error?: { code?: string; message?: string; hint?: string | null }
      request_id?: string
    } | null
    throw new ManagementApiError(
      response.status,
      body?.error?.code ?? 'E_PROVIDER_UNAVAILABLE',
      body?.error?.message ?? '审计导出失败',
      body?.error?.hint ?? null,
      body?.request_id ?? null,
    )
  }
  return response.blob()
}

export { request as requestManagementResource }
