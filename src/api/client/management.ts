'use client'

import { z } from 'zod'
import {
  chamberAffiliationSchema,
  chamberCertificationSchema,
  errorEnvelopeSchema,
  importCandidateSchema,
  importJobSchema,
  managementMeSchema,
  pageSchema,
  type ManagementMeDto,
} from '@/api/generated/huameng'
import {
  claimReviewResultSchema,
  cursorPageSchema,
  duplicateCaseSchema,
  enterpriseClaimSchema,
  ownershipDisputeSchema,
  permissionCatalogSchema,
  staffAssignmentSchema,
  staffInvitationSchema,
  verificationApplicationSchema,
  type ClaimStatusDto,
  type VerificationLevelDto,
  type VerificationStatusDto,
} from '@/api/generated/huameng-platform'

const loginResultSchema = z.object({
  account: z.object({
    id: z.string(),
    status: z.enum(['active', 'suspended']),
    display_name: z.string(),
    created_at: z.string(),
  }).strict(),
  context: z.object({
    type: z.literal('management'),
    account_id: z.string(),
  }).strict(),
  expires_in: z.number().int().positive(),
}).strict()

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  idempotencyKey?: string
}

export class ManagementApiError extends Error {
  readonly code: string
  readonly hint: string | null
  readonly status: number
  readonly requestId: string | null

  constructor(status: number, code: string, message: string, hint: string | null, requestId: string | null) {
    super(message)
    this.name = 'ManagementApiError'
    this.status = status
    this.code = code
    this.hint = hint
    this.requestId = requestId
  }
}

function csrfToken() {
  const prefix = 'hm_management_csrf='
  const value = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length)
  return value ? decodeURIComponent(value) : ''
}

function newIdempotencyKey() {
  return crypto.randomUUID().replaceAll('-', '_')
}

function queryString(values: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (method !== 'GET') headers.set('X-Management-CSRF', csrfToken())
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)

  const response = await fetch(`/api/management/${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload: unknown = contentType.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    const parsed = errorEnvelopeSchema.safeParse(payload)
    if (parsed.success) {
      throw new ManagementApiError(
        response.status,
        parsed.data.error.code,
        parsed.data.error.message,
        parsed.data.error.hint,
        parsed.data.request_id,
      )
    }
    throw new ManagementApiError(
      response.status,
      'E_MANAGEMENT_BFF',
      '管理接口暂时不可用',
      '请确认管理前端的 MANAGEMENT_API_BASE_URL 和 Agent 服务状态。',
      response.headers.get('x-request-id'),
    )
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ManagementApiError(
      502,
      'E_CONTRACT_MISMATCH',
      '管理接口响应不符合冻结契约',
      parsed.error.issues[0]?.message ?? null,
      response.headers.get('x-request-id'),
    )
  }
  return parsed.data
}

async function readAllPages<T>(
  path: string,
  itemSchema: z.ZodType<T>,
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null = null

  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: '100', sort: 'created_at' })
    if (cursor) query.set('cursor', cursor)
    const result = await request(`${path}?${query.toString()}`, pageSchema(itemSchema))
    items.push(...result.items)
    if (!result.has_more || !result.next_cursor) break
    cursor = result.next_cursor
  }

  return items
}

export async function loginManagement(phone: string, countryCode: string, password: string) {
  return request('auth/login', loginResultSchema, {
    method: 'POST',
    body: {
      phone: phone.trim(),
      country_code: countryCode.trim().toUpperCase(),
      password,
    },
  })
}

export async function logoutManagement() {
  const response = await fetch('/api/management/auth/logout', {
    method: 'POST',
    headers: { 'X-Management-CSRF': csrfToken() },
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok && response.status !== 401) {
    throw new ManagementApiError(response.status, 'E_LOGOUT', '退出登录失败', null, null)
  }
}

export function getManagementMe() {
  return request('me', managementMeSchema)
}

export function switchManagementWorkspace(workspaceId: string): Promise<ManagementMeDto> {
  return request('me/switch-workspace', managementMeSchema, {
    method: 'POST',
    body: { workspace_id: workspaceId },
    idempotencyKey: newIdempotencyKey(),
  })
}

export function listChamberAffiliations(chamberId: string) {
  return readAllPages(`chambers/${encodeURIComponent(chamberId)}/affiliations`, chamberAffiliationSchema)
}

export function listChamberCertifications(chamberId: string) {
  return readAllPages(`chambers/${encodeURIComponent(chamberId)}/certifications`, chamberCertificationSchema)
}

export function listChamberImportCandidates(chamberId: string) {
  return readAllPages(`chambers/${encodeURIComponent(chamberId)}/import-candidates`, importCandidateSchema)
}

export function getChamberEnterpriseImport(chamberId: string, jobId: string) {
  return request(
    `chambers/${encodeURIComponent(chamberId)}/enterprise-imports/${encodeURIComponent(jobId)}`,
    importJobSchema,
  )
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('无法读取 CSV 文件'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const separator = result.indexOf(',')
      resolve(separator >= 0 ? result.slice(separator + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

export async function createChamberEnterpriseImport(
  chamberId: string,
  input: {
    file: File
    certificationLevelCode: string
    validDays: number
  },
) {
  const contentBase64 = await fileToBase64(input.file)
  return request(`chambers/${encodeURIComponent(chamberId)}/enterprise-imports`, importJobSchema, {
    method: 'POST',
    idempotencyKey: newIdempotencyKey(),
    body: {
      source_file_name: input.file.name,
      content_base64: contentBase64,
      template_version: 'hm-enterprise-import-v1',
      responsibility_attestation_version: 'hm-chamber-attestation-v1',
      responsibility_accepted: true,
      default_certification_level_code: input.certificationLevelCode.trim().toUpperCase(),
      default_valid_days: input.validDays,
      update_existing_certifications: false,
      reprocess_of_job_id: null,
    },
  })
}

export function listAdminClaims(input: {
  status?: ClaimStatusDto | 'all'
  countryCode?: string
  cursor?: string | null
  limit?: number
} = {}) {
  return request(
    `admin/claims${queryString({
      status: input.status === 'all' ? undefined : input.status,
      country_code: input.countryCode?.trim().toUpperCase(),
      cursor: input.cursor,
      limit: input.limit ?? 20,
      sort: 'submitted_asc',
    })}`,
    cursorPageSchema(enterpriseClaimSchema),
  )
}

export function getAdminClaim(claimId: string) {
  return request(`admin/claims/${encodeURIComponent(claimId)}`, enterpriseClaimSchema)
}

export function reviewAdminClaim(
  claimId: string,
  body:
    | { action: 'approve'; decision_reason: string }
    | { action: 'reject'; reason: string }
    | { action: 'request_more_info'; required_items: string[]; note?: string }
    | { action: 'confirm_approval'; confirmation_token: string },
) {
  return request(`admin/claims/${encodeURIComponent(claimId)}/action`, claimReviewResultSchema, {
    method: 'POST',
    body,
    idempotencyKey: newIdempotencyKey(),
  })
}

export function listEnterpriseVerifications(input: {
  status?: VerificationStatusDto | 'all'
  countryCode?: string
  cursor?: string | null
  limit?: number
} = {}) {
  return request(
    `admin/enterprise-verifications${queryString({
      status: input.status === 'all' ? undefined : input.status,
      country_code: input.countryCode?.trim().toUpperCase(),
      cursor: input.cursor,
      limit: input.limit ?? 20,
      sort: 'submitted_asc',
    })}`,
    cursorPageSchema(verificationApplicationSchema),
  )
}

export function getEnterpriseVerification(verificationApplicationId: string) {
  return request(
    `admin/enterprise-verifications/${encodeURIComponent(verificationApplicationId)}`,
    verificationApplicationSchema,
  )
}

export function reviewEnterpriseVerification(
  verificationApplicationId: string,
  body:
    | { action: 'start_review' }
    | { action: 'request_more_info'; required_items: string[]; note?: string }
    | {
      action: 'approve'
      approved_level: VerificationLevelDto
      decision_reason: string
      valid_until?: string | null
    }
    | { action: 'reject'; reason: string },
) {
  return request(
    `admin/enterprise-verifications/${encodeURIComponent(verificationApplicationId)}/action`,
    verificationApplicationSchema,
    {
      method: 'POST',
      body,
      idempotencyKey: newIdempotencyKey(),
    },
  )
}

export function listEnterpriseDuplicates(input: {
  cursor?: string | null
  limit?: number
} = {}) {
  return request(
    `admin/enterprise-duplicates${queryString({
      cursor: input.cursor,
      limit: input.limit ?? 20,
      sort: 'risk_desc',
    })}`,
    cursorPageSchema(duplicateCaseSchema),
  )
}

export function actOnEnterpriseDuplicate(
  duplicateCaseId: string,
  body:
    | { action: 'ignore'; reason: string }
    | { action: 'confirm_duplicate'; reason: string }
    | { action: 'merge'; survivor_enterprise_id: string; confirmation_token: string },
) {
  return request(
    `admin/enterprise-duplicates/${encodeURIComponent(duplicateCaseId)}/action`,
    duplicateCaseSchema,
    {
      method: 'POST',
      body,
      idempotencyKey: newIdempotencyKey(),
    },
  )
}

export function listOwnershipDisputes(input: {
  status?: string | 'all'
  cursor?: string | null
  limit?: number
} = {}) {
  return request(
    `admin/ownership-disputes${queryString({
      status: input.status === 'all' ? undefined : input.status,
      cursor: input.cursor,
      limit: input.limit ?? 20,
      sort: 'created_asc',
    })}`,
    cursorPageSchema(ownershipDisputeSchema),
  )
}

export function getOwnershipDispute(disputeId: string) {
  return request(`admin/ownership-disputes/${encodeURIComponent(disputeId)}`, ownershipDisputeSchema)
}

export function actOnOwnershipDispute(
  disputeId: string,
  body:
    | { action: 'request_more_info'; required_items: string[]; note?: string }
    | { action: 'reject'; reason: string }
    | {
      action: 'resolve'
      resolution: string
      owner_account_ids: string[]
      confirmation_token: string
    },
) {
  return request(
    `admin/ownership-disputes/${encodeURIComponent(disputeId)}/action`,
    ownershipDisputeSchema,
    {
      method: 'POST',
      body,
      idempotencyKey: newIdempotencyKey(),
    },
  )
}

export function listManagementStaff(workspaceId: string, input: {
  keyword?: string
  status?: 'active' | 'revoked' | 'all'
  roleTemplate?: string | 'all'
  cursor?: string | null
  limit?: number
} = {}) {
  return request(
    `management/workspaces/${encodeURIComponent(workspaceId)}/staff${queryString({
      keyword: input.keyword?.trim(),
      status: input.status === 'all' ? undefined : input.status,
      role_template: input.roleTemplate === 'all' ? undefined : input.roleTemplate,
      cursor: input.cursor,
      limit: input.limit ?? 20,
      sort: 'created_desc',
    })}`,
    cursorPageSchema(staffAssignmentSchema),
  )
}

export function getManagementPermissionCatalog(workspaceId: string) {
  return request(
    `management/permission-catalog${queryString({ workspace_id: workspaceId })}`,
    permissionCatalogSchema,
  )
}

export function inviteManagementStaff(
  workspaceId: string,
  body: {
    destination_type: 'phone'
    destination: string
    display_name: string
    title: string
    role_template: 'platform_admin' | 'platform_operator' | 'chamber_admin'
    grants: Array<{
      action: string
      scope_type: 'platform' | 'country' | 'chamber' | 'enterprise'
      scope_id: string
      country_code: string | null
    }>
    expires_in_seconds: number
  },
) {
  return request(
    `management/workspaces/${encodeURIComponent(workspaceId)}/staff-invitations`,
    staffInvitationSchema,
    {
      method: 'POST',
      body,
      idempotencyKey: newIdempotencyKey(),
    },
  )
}

export function updateManagementStaff(
  staffAssignmentId: string,
  body:
    | {
      action: 'update'
      role_template: 'platform_admin' | 'platform_operator' | 'chamber_admin'
      title: string
      grants: Array<{
        action: string
        scope_type: 'platform' | 'country' | 'chamber' | 'enterprise'
        scope_id: string
        country_code: string | null
      }>
    }
    | {
      action: 'revoke'
      reason: string
      confirmation_token: string
    },
) {
  return request(
    `management/staff/${encodeURIComponent(staffAssignmentId)}/action`,
    staffAssignmentSchema,
    {
      method: 'POST',
      body,
      idempotencyKey: newIdempotencyKey(),
    },
  )
}
