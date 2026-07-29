import type {
  ChamberAffiliationDto,
  ChamberCertificationDto,
  ImportCandidateDto,
  ImportJobDto,
  ManagementEnterpriseDto,
} from '@/api/generated/huameng'
import type {
  ChamberAffiliation,
  ChamberCertification,
  ImportCandidate,
  ImportJob,
  Workspace,
} from '@/lib/types'

export function mapWorkspace(dto: ManagementEnterpriseDto): Workspace {
  const capabilities: Workspace['capabilities'] = dto.subject_type === 'chamber'
    ? [
      'dashboard.read',
      'enterprise.read',
      'enterprise.create',
      'chamber_membership.read',
      'staff.manage',
      'audit.read',
    ]
    : dto.role_template === 'platform_admin'
      ? ['dashboard.read', 'enterprise.verify', 'claim.review', 'duplicate.review', 'dispute.review', 'staff.manage', 'audit.read']
      : ['dashboard.read', 'enterprise.verify', 'claim.review', 'duplicate.review', 'dispute.review', 'audit.read']

  return {
    id: dto.enterprise_id,
    name: dto.legal_name,
    shortName: dto.display_name,
    kind: dto.subject_type,
    role: dto.role_template,
    capabilities,
  }
}

export function mapImportJob(dto: ImportJobDto): ImportJob {
  return {
    jobId: dto.job_id,
    chamberId: dto.chamber_id,
    sourceFileName: dto.source_file_name,
    status: dto.status,
    totalRows: dto.total_rows,
    succeededRows: dto.succeeded_rows,
    candidateRows: dto.candidate_rows,
    failedRows: dto.failed_rows,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapAffiliation(dto: ChamberAffiliationDto): ChamberAffiliation {
  return {
    affiliationId: dto.affiliation_id,
    chamberId: dto.chamber_id,
    enterpriseId: dto.enterprise_id,
    enterpriseName: dto.enterprise_name,
    status: dto.status,
    joinedAt: dto.joined_at,
    platformVerificationStatus: dto.platform_verification_status,
    version: dto.version,
  }
}

export function mapCertification(dto: ChamberCertificationDto): ChamberCertification {
  return {
    certificationId: dto.certification_id,
    affiliationId: dto.affiliation_id,
    enterpriseId: dto.enterprise_id,
    enterpriseName: dto.enterprise_name,
    levelCode: dto.level_code,
    levelName: dto.level_name,
    validFrom: dto.valid_from,
    validUntil: dto.valid_until,
    status: dto.status,
    platformVerificationStatus: dto.platform_verification_status,
  }
}

export function mapCandidate(dto: ImportCandidateDto): ImportCandidate {
  return {
    candidateId: dto.candidate_id,
    chamberId: dto.chamber_id,
    legalName: dto.legal_name,
    displayName: dto.display_name,
    countryCode: dto.country_code,
    status: dto.status,
    resolvedEnterpriseId: dto.resolved_enterprise_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}
