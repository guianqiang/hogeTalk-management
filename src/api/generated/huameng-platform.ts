import { z } from 'zod'
import { managementMenuKeySchema } from './huameng'

export { managementMenuKeySchema } from './huameng'
export type { ManagementMenuKey } from './huameng'

export const pageMetaSchema = z.object({
  next_cursor: z.string().nullable().optional(),
  has_more: z.boolean(),
}).strict()

export function cursorPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: pageMetaSchema,
  }).strict()
}

export const claimStatusSchema = z.enum([
  'submitted',
  'needs_more_info',
  'under_review',
  'pending_second_review',
  'approved',
  'rejected',
  'cancelled',
])

export const claimEvidenceSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['received', 'verified', 'rejected']),
  rejection_reason: z.string().nullable().optional(),
  created_at: z.string(),
}).strict()

export const enterpriseClaimSchema = z.object({
  id: z.string(),
  enterprise_id: z.string(),
  claimant_account_id: z.string(),
  status: claimStatusSchema,
  risk_level: z.enum(['low', 'medium', 'high']),
  evidence: z.array(claimEvidenceSchema).nullable().optional(),
  reviewer_note: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

const membershipSchema = z.object({
  id: z.string(),
  enterprise_id: z.string(),
  account_id: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  clearances: z.array(z.string()),
  status: z.enum(['active', 'suspended', 'left', 'revoked']),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

export const claimReviewResultSchema = z.object({
  claim: enterpriseClaimSchema,
  membership: membershipSchema.nullable().optional(),
}).strict()

export const verificationLevelSchema = z.enum(['L1', 'L2', 'L3'])

export const verificationStatusSchema = z.enum([
  'submitted',
  'needs_more_info',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
])

export const verificationEnterpriseSchema = z.object({
  id: z.string(),
  legal_name: z.string(),
  display_name: z.string(),
  country_code: z.string(),
  type: z.enum(['company', 'chamber', 'platform', 'other']),
  lifecycle_status: z.enum(['active', 'suspended', 'merged', 'closed']),
  verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']),
  ownership_status: z.enum(['unclaimed', 'claimed', 'disputed']),
  directory_visibility: z.enum(['private', 'listed']),
  created_at: z.string(),
}).strip()

export const verificationEvidenceSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['received', 'verified', 'rejected']),
  note: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  created_at: z.string(),
}).strict()

export const verificationApplicationSchema = z.object({
  id: z.string(),
  enterprise_id: z.string(),
  enterprise: verificationEnterpriseSchema,
  applicant_account_id: z.string(),
  requested_level: verificationLevelSchema,
  approved_level: verificationLevelSchema.nullable().optional(),
  revision: z.number().int().positive(),
  status: verificationStatusSchema,
  statement: z.string().nullable().optional(),
  required_items: z.array(z.string()).optional(),
  reviewer_note: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  evidence: z.array(verificationEvidenceSchema),
  submitted_at: z.string(),
  updated_at: z.string(),
}).strict()

export const duplicateCaseSchema = z.object({
  id: z.string(),
  source_enterprise_id: z.string(),
  source_enterprise: verificationEnterpriseSchema.optional(),
  candidate_enterprise_id: z.string(),
  candidate_enterprise: verificationEnterpriseSchema.optional(),
  risk_score: z.number().min(0).max(1),
  status: z.enum(['open', 'ignored', 'confirmed', 'merged']),
  created_at: z.string(),
}).strict()

export const ownershipDisputeSchema = z.object({
  id: z.string(),
  enterprise_id: z.string(),
  enterprise: verificationEnterpriseSchema.optional(),
  claimant_account_id: z.string(),
  status: z.enum([
    'submitted',
    'needs_more_info',
    'under_review',
    'approved',
    'rejected',
    'cancelled',
  ]),
  reason: z.string(),
  resolution: z.string().nullable().optional(),
  evidence: z.array(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

const currentStaffAssignmentSchema = z.object({
  staff_assignment_id: z.string(),
  enterprise_id: z.string(),
  membership_id: z.string(),
  account_id: z.string(),
  username: z.string(),
  display_name: z.string(),
  masked_phone: z.string(),
  title: z.string(),
  role_template: z.enum(['platform_admin', 'platform_operator', 'chamber_admin']),
  status: z.enum(['active', 'inactive', 'revoked']),
  menu_keys: z.array(managementMenuKeySchema),
  must_change_password: z.boolean(),
  joined_at: z.string(),
  last_active_at: z.string().nullable().optional(),
  version: z.number().int().positive(),
}).strict()

export const staffAssignmentSchema = currentStaffAssignmentSchema

export const menuCatalogSchema = z.object({
  enterprise_id: z.string(),
  items: z.array(z.object({
    menu_key: managementMenuKeySchema,
    display_name: z.string(),
    description: z.string(),
    route: z.string(),
  }).strict()),
}).strict()

export type EnterpriseClaimDto = z.infer<typeof enterpriseClaimSchema>
export type ClaimStatusDto = z.infer<typeof claimStatusSchema>
export type VerificationApplicationDto = z.infer<typeof verificationApplicationSchema>
export type VerificationLevelDto = z.infer<typeof verificationLevelSchema>
export type VerificationStatusDto = z.infer<typeof verificationStatusSchema>
export type DuplicateCaseDto = z.infer<typeof duplicateCaseSchema>
export type OwnershipDisputeDto = z.infer<typeof ownershipDisputeSchema>
export type StaffAssignmentDto = z.infer<typeof staffAssignmentSchema>
export type MenuCatalogDto = z.infer<typeof menuCatalogSchema>
