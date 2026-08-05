'use client'

import { z } from 'zod'
import { randomUuid } from '@/lib/random-id'
import { ManagementApiError, request } from './management'
import { errorEnvelopeSchema } from '@/api/generated/huameng'

export const workspacePermissionSchema = z.enum([
  'enterprise_workspace.access',
  'supply_demand.read',
  'supply_demand.manage',
  'supply_demand.consultation.manage',
  'ai_card.read',
  'ai_card.manage',
  'ai_card.publish',
])

const workspacePermissionCatalogSchema = z.object({
  items: z.array(z.object({
    code: workspacePermissionSchema,
    name: z.string(),
    description: z.string(),
  }).strict()),
}).strict()

export const enterpriseWorkspaceAccountSchema = z.object({
  membershipId: z.string(),
  accountId: z.string(),
  enterpriseId: z.string(),
  enterpriseName: z.string(),
  displayName: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  status: z.enum(['active', 'suspended', 'left', 'revoked']),
  permissions: z.array(workspacePermissionSchema),
  version: z.number().int().positive(),
  updatedAt: z.string(),
}).strict()

const enterpriseWorkspaceAccountPageSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  size: z.number().int().positive(),
  list: z.array(enterpriseWorkspaceAccountSchema),
}).strict()

const enterpriseLoginSchema = z.object({
  account: z.object({
    id: z.string(),
    status: z.enum(['active', 'suspended']),
    display_name: z.string(),
    created_at: z.string(),
  }).strict(),
  context: z.union([
    z.object({
      type: z.literal('enterprise'),
      account_id: z.string(),
      enterprise_id: z.string(),
      membership_id: z.string(),
      role: z.enum(['owner', 'admin', 'member']),
      clearances: z.array(z.string()),
    }).strict(),
    z.object({
      type: z.literal('personal'),
      account_id: z.string(),
    }).strict(),
  ]),
  expires_in: z.number().int().positive(),
}).strict()

export const enterpriseAccountSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'suspended']),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  locale: z.string(),
  timezone: z.string(),
  masked_phone: z.string().nullable(),
  profile_version: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

const enterpriseAuthChallengeSchema = z.object({
  id: z.string(),
  purpose: z.enum(['password_reset', 'bind_phone']),
  masked_destination: z.string(),
  expires_at: z.string(),
  resend_after: z.number().int().positive(),
}).strict()

const enterpriseAccountIdentifierSchema = z.object({
  id: z.string(),
  type: z.literal('phone'),
  masked_value: z.string(),
  verified_at: z.string(),
}).strict()

export const enterpriseWorkspaceSchema = z.object({
  accountId: z.string(),
  membershipId: z.string().nullable(),
  role: z.enum(['owner', 'admin', 'member']).nullable(),
  permissions: z.array(workspacePermissionSchema),
  enterprise: z.union([
    z.object({
      id: z.string(),
      displayName: z.string(),
      legalName: z.string(),
      countryCode: z.string().length(2),
      logo: z.record(z.unknown()).nullable(),
      verificationStatus: z.string(),
      onboardingStatus: z.string(),
    }).strict(),
    z.null(),
  ]),
  supplyDemandCounts: z.record(z.number().int()),
  hasAiCard: z.boolean(),
}).strict()

export const enterpriseWorkspacePersonalSchema = z.object({
  type: z.literal('personal'),
  account_id: z.string(),
}).strict()

export const enterpriseWorkspaceEnterpriseSchema = z.object({
  type: z.literal('enterprise'),
  account_id: z.string(),
  enterprise_id: z.string(),
  membership_id: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  clearances: z.array(z.string()),
}).strict()

export const enterpriseWorkspaceAuthContextSchema = z.union([
  enterpriseWorkspacePersonalSchema,
  enterpriseWorkspaceEnterpriseSchema,
])

export const supplyDemandSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  enterpriseId: z.string(),
  enterpriseName: z.string(),
  type: z.enum(['supply', 'demand']),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  status: z.enum(['draft', 'pending', 'published', 'rejected', 'withdrawn']),
  reviewNote: z.string().nullable(),
  publishedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

const supplyDemandPageSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  size: z.number().int().positive(),
  list: z.array(supplyDemandSchema),
}).strict()

export const supplyDemandConsultationSchema = z.object({
  id: z.string(),
  supplyDemandId: z.string(),
  supplyDemandTitle: z.string(),
  requesterAccountId: z.string(),
  requesterEnterpriseId: z.string().nullable(),
  targetEnterpriseId: z.string(),
  message: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  status: z.enum(['new', 'following', 'completed', 'closed']),
  followupNote: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

const supplyDemandConsultationPageSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  size: z.number().int().positive(),
  list: z.array(supplyDemandConsultationSchema),
}).strict()

export const aiCardSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  enterpriseId: z.string(),
  displayName: z.string(),
  displayNameEn: z.string().nullable(),
  title: z.string().nullable(),
  companyName: z.string(),
  companyNameEn: z.string().nullable(),
  subtitle: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  wechat: z.string().nullable(),
  address: z.string().nullable(),
  bio: z.string().nullable(),
  avatarMediaId: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  companyLogoMediaId: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
  theme: z.enum(['business', 'fashion']),
  displayConfig: z.record(z.boolean()),
  visibility: z.enum(['private', 'public']),
  shareId: z.string(),
  status: z.enum(['active', 'revoked']),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

export type EnterpriseWorkspaceDto = z.infer<typeof enterpriseWorkspaceSchema>
export type EnterpriseAccountDto = z.infer<typeof enterpriseAccountSchema>
export type WorkspacePermission = z.infer<typeof workspacePermissionSchema>
export type WorkspacePermissionCatalogDto = z.infer<typeof workspacePermissionCatalogSchema>
export type EnterpriseWorkspaceAccountDto = z.infer<typeof enterpriseWorkspaceAccountSchema>
export type SupplyDemandDto = z.infer<typeof supplyDemandSchema>
export type SupplyDemandConsultationDto = z.infer<typeof supplyDemandConsultationSchema>
export type AiCardDto = z.infer<typeof aiCardSchema>

export type SupplyDemandWriteInput = {
  type: 'supply' | 'demand'
  category: string
  title: string
  description: string
  contactName: string
  contactPhone: string
  expiresAt: string | null
}

export type AiCardWriteInput = {
  displayName: string
  displayNameEn: string | null
  title: string | null
  companyName: string
  companyNameEn: string | null
  subtitle: string | null
  phone: string | null
  email: string | null
  wechat: string | null
  address: string | null
  bio: string | null
  avatarMediaId: string | null
  companyLogoMediaId: string | null
  theme: 'business' | 'fashion'
  displayConfig: Record<string, boolean>
  visibility: 'private' | 'public'
  expectedVersion: number | null
}

function idempotencyKey() {
  return randomUuid().replaceAll('-', '_')
}

function csrfToken() {
  const entry = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('hm_management_csrf='))
  return entry ? decodeURIComponent(entry.slice('hm_management_csrf='.length)) : ''
}

export function enterpriseSessionDomain() {
  if (typeof document === 'undefined') return 'management'
  const entry = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('hm_management_domain='))
  return entry?.split('=', 2)[1] === 'enterprise' ? 'enterprise' : 'management'
}

export function loginEnterpriseWorkspace(
  identifier: string,
  countryCode: string,
  password: string,
) {
  return request('auth/enterprise-workspace/password/login', enterpriseLoginSchema, {
    method: 'POST',
    body: {
      identifier: identifier.trim(),
      country_code: countryCode.trim().toUpperCase(),
      password,
    },
  })
}

export function getEnterpriseWorkspace() {
  return request('enterprise/workspace', enterpriseWorkspaceSchema)
}

export function getEnterpriseWorkspacePermissionCatalog() {
  return request('management/enterprise-workspace/permissions', workspacePermissionCatalogSchema)
}

export function listEnterpriseWorkspaceAccounts(input: {
  keyword?: string
  page?: number
  size?: number
} = {}) {
  const query = new URLSearchParams({
    page: String(input.page ?? 1),
    size: String(input.size ?? 20),
  })
  if (input.keyword?.trim()) query.set('keyword', input.keyword.trim())
  return request(
    `management/enterprise-workspace/accounts?${query.toString()}`,
    enterpriseWorkspaceAccountPageSchema,
  )
}

export function updateEnterpriseWorkspacePermissions(
  membershipId: string,
  permissions: WorkspacePermission[],
  expectedVersion: number,
  reason: string,
) {
  return request(
    `management/enterprise-workspace/memberships/${encodeURIComponent(membershipId)}/action`,
    enterpriseWorkspaceAccountSchema,
    {
      method: 'POST',
      idempotencyKey: idempotencyKey(),
      body: {
        action: 'change_permissions',
        permissions,
        expectedVersion,
        reason: reason.trim(),
      },
    },
  )
}

export function getEnterpriseAccount() {
  return request('account', enterpriseAccountSchema)
}

export function updateEnterpriseAccountProfile(body: {
  displayName: string
  avatarUrl: string | null
  locale: string
  timezone: string
  expectedVersion: number
}) {
  return request('account/action', enterpriseAccountSchema, {
    method: 'POST',
    idempotencyKey: idempotencyKey(),
    body: {
      action: 'update_profile',
      display_name: body.displayName,
      avatar_url: body.avatarUrl,
      locale: body.locale,
      timezone: body.timezone,
      expected_version: body.expectedVersion,
    },
  })
}

export function createEnterpriseAuthChallenge(
  phone: string,
  purpose: 'password_reset' | 'bind_phone' = 'password_reset',
) {
  return request('auth/challenges', enterpriseAuthChallengeSchema, {
    method: 'POST',
    body: {
      purpose,
      phone: phone.trim(),
      country_code: 'CN',
      locale: 'zh-CN',
      risk_token: '',
    },
  })
}

export function changeEnterprisePassword(newPassword: string, confirmationToken: string) {
  return request('auth/password/set', z.null(), {
    method: 'POST',
    body: {
      new_password: newPassword,
      confirmation_token: confirmationToken,
    },
  })
}

export function bindEnterprisePhone(challengeId: string, code: string) {
  return request('me/identifiers', enterpriseAccountIdentifierSchema, {
    method: 'POST',
    idempotencyKey: idempotencyKey(),
    body: {
      type: 'phone',
      challenge_id: challengeId,
      code,
    },
  })
}

export function listEnterpriseSupplyDemands(input: {
  status?: SupplyDemandDto['status']
  type?: SupplyDemandDto['type']
  keyword?: string
  page?: number
  size?: number
} = {}) {
  const query = new URLSearchParams()
  if (input.status) query.set('status', input.status)
  if (input.type) query.set('type', input.type)
  if (input.keyword?.trim()) query.set('keyword', input.keyword.trim())
  query.set('page', String(input.page ?? 1))
  query.set('size', String(input.size ?? 20))
  return request(`enterprise/supply-demands?${query.toString()}`, supplyDemandPageSchema)
}

export function listManagementSupplyDemands(input: {
  status?: SupplyDemandDto['status']
  type?: SupplyDemandDto['type']
  keyword?: string
  page?: number
  size?: number
} = {}) {
  const query = new URLSearchParams({
    page: String(input.page ?? 1),
    size: String(input.size ?? 20),
  })
  if (input.status) query.set('status', input.status)
  if (input.type) query.set('type', input.type)
  if (input.keyword?.trim()) query.set('keyword', input.keyword.trim())
  return request(`management/supply-demands?${query.toString()}`, supplyDemandPageSchema)
}

export function reviewManagementSupplyDemand(
  itemId: string,
  decision: 'approve' | 'reject',
  expectedVersion: number,
  note: string | null,
) {
  return request(
    `management/supply-demands/${encodeURIComponent(itemId)}/review`,
    supplyDemandSchema,
    {
      method: 'POST',
      idempotencyKey: idempotencyKey(),
      body: { decision, note: note?.trim() || null, expectedVersion },
    },
  )
}

export function createEnterpriseSupplyDemand(body: SupplyDemandWriteInput) {
  return request('enterprise/supply-demands', supplyDemandSchema, {
    method: 'POST',
    idempotencyKey: idempotencyKey(),
    body,
  })
}

export function updateEnterpriseSupplyDemand(
  itemId: string,
  body: SupplyDemandWriteInput & { expectedVersion: number },
) {
  return request(`enterprise/supply-demands/${encodeURIComponent(itemId)}`, supplyDemandSchema, {
    method: 'PUT',
    idempotencyKey: idempotencyKey(),
    body,
  })
}

export function actEnterpriseSupplyDemand(
  itemId: string,
  action: 'submit' | 'withdraw',
  expectedVersion: number,
) {
  return request(`enterprise/supply-demands/${encodeURIComponent(itemId)}/action`, supplyDemandSchema, {
    method: 'POST',
    idempotencyKey: idempotencyKey(),
    body: { action, expectedVersion },
  })
}

export function listEnterpriseSupplyDemandConsultations(input: {
  direction?: 'received' | 'sent'
  status?: SupplyDemandConsultationDto['status']
  page?: number
  size?: number
} = {}) {
  const query = new URLSearchParams({
    direction: input.direction ?? 'received',
    page: String(input.page ?? 1),
    size: String(input.size ?? 10),
  })
  if (input.status) query.set('status', input.status)
  return request(
    `enterprise/supply-demand-consultations?${query.toString()}`,
    supplyDemandConsultationPageSchema,
  )
}

export function actEnterpriseSupplyDemandConsultation(
  consultationId: string,
  action: 'follow' | 'complete' | 'close',
  expectedVersion: number,
  note: string | null = null,
) {
  return request(
    `enterprise/supply-demand-consultations/${encodeURIComponent(consultationId)}/action`,
    supplyDemandConsultationSchema,
    {
      method: 'POST',
      idempotencyKey: idempotencyKey(),
      body: { action, note, expectedVersion },
    },
  )
}

export function getEnterpriseAiCard() {
  return request('enterprise/ai-card', aiCardSchema.nullable())
}

export function saveEnterpriseAiCard(body: AiCardWriteInput) {
  return request('enterprise/ai-card', aiCardSchema, {
    method: 'PUT',
    idempotencyKey: idempotencyKey(),
    body,
  })
}

export async function uploadEnterpriseImage(
  file: File,
  purpose: 'profile' | 'enterprise',
) {
  const query = new URLSearchParams({ purpose, filename: file.name })
  const response = await fetch(`/api/media/uploads/content?${query.toString()}`, {
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
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = errorEnvelopeSchema.safeParse(payload)
    throw new ManagementApiError(
      response.status,
      error.success ? error.data.error.code : 'E_UPLOAD',
      error.success ? error.data.error.message : '图片上传失败',
      error.success ? error.data.error.hint : null,
      error.success ? error.data.request_id : null,
    )
  }
  const parsed = z.object({
    id: z.string(),
    media_url: z.string(),
    access_url: z.string().nullable(),
  }).passthrough().safeParse(payload)
  if (!parsed.success) {
    throw new ManagementApiError(502, 'E_CONTRACT_MISMATCH', '上传接口响应不符合冻结契约', parsed.error.issues[0]?.message ?? null, null)
  }
  return parsed.data
}
