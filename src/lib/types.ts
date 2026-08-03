import type { ManagementMenuKey } from '@/api/generated/huameng'

export type WorkspaceKind = 'platform' | 'chamber'
export type WorkspaceRole = 'platform_admin' | 'platform_operator' | 'chamber_admin'

export interface Workspace {
  id: string
  staffAssignmentId?: string
  name: string
  shortName: string
  kind: WorkspaceKind
  role: WorkspaceRole
  staffTitle: string
  menuKeys: ManagementMenuKey[]
}

export interface MockUser {
  id: string
  name: string
  account: string
  title: string
  avatarText: string
  workspaceIds: string[]
}

export type EnterpriseStatus = 'active' | 'pending' | 'suspended'
export type EnterpriseKind = 'platform' | 'chamber' | 'company'

export interface Enterprise {
  id: string
  name: string
  shortName: string
  kind: EnterpriseKind
  status: EnterpriseStatus
  country: string
  region: string
  industry: string
  contactName: string
  contactPhone: string
  memberCount: number
  chamberCount: number
  updatedAt: string
}

export type AccountMembershipStatus = 'active' | 'suspended' | 'revoked'

export interface AccountMembership {
  id: string
  workspaceId: string
  name: string
  account: string
  title: string
  role: WorkspaceRole
  status: AccountMembershipStatus
  joinedAt: string
  lastActiveAt: string
  version: number
}

export type ChamberMembershipStatus =
  | 'submitted'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'rejected'
  | 'withdrawn'
  | 'terminated'

export interface ChamberMembership {
  id: string
  chamberId: string
  chamberName?: string
  enterpriseId: string
  enterpriseName: string
  industry: string
  contactName: string
  contactPhone?: string
  enterpriseRegion?: string
  applicationReason?: string
  submittedBy?: string
  materials?: string[]
  level: '基础会员' | '优质会员' | '卓越会员'
  status: ChamberMembershipStatus
  submittedAt: string
  joinedAt?: string
  expiresAt?: string
  version: number
}

export interface AuditEvent {
  id: string
  workspaceId: string
  actorName: string
  action: string
  targetType: string
  targetName: string
  result: 'success' | 'rejected'
  summary: string
  createdAt: string
}

export interface MockSession {
  userId: string
  signedInAt: string
}

export interface MockDatabase {
  enterprises: Enterprise[]
  accountMemberships: AccountMembership[]
  chamberMemberships: ChamberMembership[]
  auditEvents: AuditEvent[]
}

export interface ManagementUser {
  id: string
  name: string
  account: string
  avatarText: string
}

export type ImportJobStatus =
  | 'uploaded'
  | 'validating'
  | 'applying'
  | 'completed'
  | 'partial_failed'
  | 'failed'

export interface ImportJob {
  jobId: string
  chamberId: string
  sourceFileName: string
  status: ImportJobStatus
  totalRows: number
  succeededRows: number
  candidateRows: number
  failedRows: number
  createdAt: string
  updatedAt: string
}

export type AffiliationStatus = 'active' | 'suspended' | 'ended'

export interface ChamberAffiliation {
  affiliationId: string
  chamberId: string
  enterpriseId: string
  enterpriseName: string
  status: AffiliationStatus
  joinedAt: string
  platformVerificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  version: number
}

export type CertificationStatus = 'active' | 'expired' | 'revoked' | 'inactive_affiliation'

export interface ChamberCertification {
  certificationId: string
  affiliationId: string
  enterpriseId: string
  enterpriseName: string
  levelCode: string
  levelName: string
  validFrom: string
  validUntil: string
  status: CertificationStatus
  platformVerificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
}

export type ImportCandidateStatus =
  | 'needs_identifier'
  | 'resolving'
  | 'resolved'
  | 'conflict'
  | 'discarded'
  | 'archived'

export interface ImportCandidate {
  candidateId: string
  chamberId: string
  legalName: string
  displayName: string
  countryCode: string
  status: ImportCandidateStatus
  resolvedEnterpriseId: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceSnapshot {
  affiliations: ChamberAffiliation[]
  certifications: ChamberCertification[]
  candidates: ImportCandidate[]
  importJobs: ImportJob[]
  loading: boolean
  error: string | null
  updatedAt: string | null
}

export interface CreateEnterpriseImportInput {
  file: File
  certificationLevelCode: string
  validDays: number
  responsibilityAccepted: true
}
