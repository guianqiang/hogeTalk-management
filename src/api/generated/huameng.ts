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

export const managementMeSchema = z.object({
  account_id: z.string(),
  preferred_workspace_id: z.string().nullable(),
  workspaces: z.array(managementWorkspaceSchema),
}).strict()

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

export function pageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }).strict()
}

export type ErrorEnvelopeDto = z.infer<typeof errorEnvelopeSchema>
export type ManagementAuthSessionDto = z.infer<typeof managementAuthSessionSchema>
export type ManagementWorkspaceDto = z.infer<typeof managementWorkspaceSchema>
export type ManagementMeDto = z.infer<typeof managementMeSchema>
export type ImportJobDto = z.infer<typeof importJobSchema>
export type ChamberAffiliationDto = z.infer<typeof chamberAffiliationSchema>
export type ChamberCertificationDto = z.infer<typeof chamberCertificationSchema>
export type ImportCandidateDto = z.infer<typeof importCandidateSchema>
