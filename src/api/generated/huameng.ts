import { z } from 'zod'

const nullableString = z.string().nullable()

export const errorEnvelopeSchema = z.object({
  request_id: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    hint: nullableString,
    where: nullableString,
    trace_id: nullableString,
    retryable: z.boolean(),
    client_action: z.string(),
    field: nullableString,
    retry_after: z.number().int().nullable(),
    doc_url: z.string().nullable(),
  }).passthrough(),
}).passthrough()

export const managementAuthSessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive(),
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
}).strict()

export const managementPasswordChangeRequiredSchema = z.object({
  next_step: z.literal('change_password'),
  password_change_token: z.string(),
  expires_in: z.number().int().positive(),
  account: z.object({
    id: z.string(),
    status: z.enum(['active', 'suspended']),
    display_name: z.string(),
    created_at: z.string(),
  }).strict(),
}).strict()

export const managementLoginResponseSchema = z.union([
  managementAuthSessionSchema,
  managementPasswordChangeRequiredSchema,
])

export const managementWorkspaceSchema = z.object({
  workspace_id: z.string(),
  membership_id: z.string(),
  staff_assignment_id: z.string(),
  subject_type: z.enum(['chamber', 'platform']),
  legal_name: z.string(),
  display_name: z.string(),
  country_code: z.string(),
  role_template: z.enum(['platform_admin', 'platform_operator', 'chamber_admin']),
}).strict()

export const managementEnterpriseSchema = z.object({
  enterprise_id: z.string(),
  membership_id: z.string(),
  staff_assignment_id: z.string(),
  subject_type: z.enum(['chamber', 'platform']),
  legal_name: z.string(),
  display_name: z.string(),
  country_code: z.string(),
  role_template: z.enum(['platform_admin', 'platform_operator', 'chamber_admin']),
}).strict()

const currentManagementMeSchema = z.object({
  account_id: z.string(),
  enterprise: managementEnterpriseSchema,
}).strict()

const legacyManagementMeSchema = z.object({
  account_id: z.string(),
  preferred_workspace_id: z.string().nullable(),
  workspaces: z.array(managementWorkspaceSchema),
}).strict()

export const managementMeSchema = z.preprocess((value) => {
  const legacy = legacyManagementMeSchema.safeParse(value)
  if (!legacy.success) return value
  const workspace = legacy.data.workspaces[0]
  if (!workspace) return value
  return {
    account_id: legacy.data.account_id,
    enterprise: {
      enterprise_id: workspace.workspace_id,
      membership_id: workspace.membership_id,
      staff_assignment_id: workspace.staff_assignment_id,
      subject_type: workspace.subject_type,
      legal_name: workspace.legal_name,
      display_name: workspace.display_name,
      country_code: workspace.country_code,
      role_template: workspace.role_template,
    },
  }
}, currentManagementMeSchema)

export const importJobSchema = z.object({
  job_id: z.string(),
  chamber_id: z.string(),
  source_file_name: z.string(),
  file_digest: z.string(),
  template_version: z.string(),
  status: z.enum(['uploaded', 'validating', 'applying', 'completed', 'partial_failed', 'failed']),
  total_rows: z.number().int().nonnegative(),
  succeeded_rows: z.number().int().nonnegative(),
  candidate_rows: z.number().int().nonnegative(),
  failed_rows: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

export const chamberAffiliationSchema = z.object({
  affiliation_id: z.string(),
  chamber_id: z.string(),
  enterprise_id: z.string(),
  enterprise_name: z.string(),
  status: z.enum(['active', 'suspended', 'ended']),
  joined_at: z.string(),
  platform_verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']),
  version: z.number().int().positive().default(1),
}).strict()

export const chamberCertificationSchema = z.object({
  certification_id: z.string(),
  affiliation_id: z.string(),
  enterprise_id: z.string(),
  enterprise_name: z.string(),
  level_code: z.string(),
  level_name: z.string(),
  valid_from: z.string(),
  valid_until: z.string(),
  status: z.enum(['active', 'expired', 'revoked', 'inactive_affiliation']),
  platform_verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']),
}).strict()

export const importCandidateSchema = z.object({
  candidate_id: z.string(),
  chamber_id: z.string(),
  legal_name: z.string(),
  display_name: z.string(),
  country_code: z.string(),
  status: z.enum(['needs_identifier', 'resolving', 'resolved', 'conflict', 'discarded', 'archived']),
  resolved_enterprise_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

export const certificationLevelSchema = z.object({
  id: z.string(),
  chamber_id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  sort_order: z.number().int(),
  default_valid_days: z.number().int().positive(),
  is_default: z.boolean(),
  is_enabled: z.boolean(),
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

export const affiliationDetailSchema = z.object({
  affiliation: chamberAffiliationSchema,
  certification: chamberCertificationSchema.nullable(),
}).strict()

export const importRowSchema = z.object({
  row_id: z.string(),
  row_number: z.number().int().positive(),
  legal_name: z.string(),
  country_code: z.string(),
  identifier_type: z.enum(['cn_uscc', 'local_registration']).nullable().optional(),
  masked_identifier: z.string().nullable().optional(),
  status: z.enum(['pending', 'processing', 'succeeded', 'candidate', 'failed']),
  enterprise_resolution: z.enum([
    'matched_existing',
    'created_provisional',
    'candidate_created',
    'unresolved',
    'error',
  ]),
  affiliation_result: z.enum(['created', 'already_active', 'restored', 'not_applicable', 'error']),
  chamber_certification_result: z.enum(['issued', 'already_active', 'renewed', 'not_applicable', 'error']),
  enterprise_id: z.string().nullable().optional(),
  affiliation_id: z.string().nullable().optional(),
  certification_id: z.string().nullable().optional(),
  candidate_id: z.string().nullable().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
}).strict()

export function pageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }).strict()
}

export type ErrorEnvelopeDto = z.infer<typeof errorEnvelopeSchema>
export type ManagementAuthSessionDto = z.infer<typeof managementAuthSessionSchema>
export type ManagementPasswordChangeRequiredDto = z.infer<typeof managementPasswordChangeRequiredSchema>
export type ManagementLoginResponseDto = z.infer<typeof managementLoginResponseSchema>
export type ManagementWorkspaceDto = z.infer<typeof managementWorkspaceSchema>
export type ManagementEnterpriseDto = z.infer<typeof managementEnterpriseSchema>
export type ManagementMeDto = z.infer<typeof managementMeSchema>
export type ImportJobDto = z.infer<typeof importJobSchema>
export type ChamberAffiliationDto = z.infer<typeof chamberAffiliationSchema>
export type ChamberCertificationDto = z.infer<typeof chamberCertificationSchema>
export type ImportCandidateDto = z.infer<typeof importCandidateSchema>
export type CertificationLevelDto = z.infer<typeof certificationLevelSchema>
export type AffiliationDetailDto = z.infer<typeof affiliationDetailSchema>
export type ImportRowDto = z.infer<typeof importRowSchema>
