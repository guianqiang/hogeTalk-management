import type {
  ChamberAffiliationDto,
  ChamberCertificationDto,
  ImportCandidateDto,
  ImportJobDto,
  ManagementEnterpriseDto,
  CurrentChamberEnterpriseDto,
} from '@/api/generated/huameng'
import type {
  ChamberAffiliation,
  ChamberCertification,
  ImportCandidate,
  ImportJob,
  Workspace,
} from '@/lib/types'

export function mapWorkspace(dto: ManagementEnterpriseDto): Workspace {
  return {
    id: dto.enterprise_id,
    staffAssignmentId: dto.staff_assignment_id,
    name: dto.legal_name,
    shortName: dto.display_name,
    kind: dto.subject_type,
    role: dto.role_template,
    staffTitle: dto.title,
    menuKeys: [...dto.menu_keys],
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
    countryCode: '',
    enterpriseType: 3,
    description: '',
    contactPhone: '',
    contactEmail: '',
    declaredCreditCode: '',
    chamberLevelId: null,
    chamberLevelName: null,
    chamberLevelExpireAt: null,
    updatedAt: dto.joined_at,
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

export function mapCurrentChamberAffiliation(
  dto: CurrentChamberEnterpriseDto,
): ChamberAffiliation {
  return {
    affiliationId: dto.enterprise_id,
    chamberId: dto.chamber_id ?? '',
    enterpriseId: dto.enterprise_id,
    enterpriseName: dto.name,
    status: dto.status === 'enabled' ? 'active' : 'suspended',
    joinedAt: dto.created_at,
    platformVerificationStatus: dto.is_verified
      ? 'verified'
      : dto.audit_status === 'rejected'
        ? 'rejected'
        : dto.audit_status === 'pending'
          ? 'pending'
          : 'unverified',
    countryCode: dto.country_code,
    enterpriseType: dto.enterprise_type === 2 || dto.enterprise_type === 3
      ? dto.enterprise_type
      : 1,
    description: dto.description ?? '',
    contactPhone: dto.contact_phone ?? '',
    contactEmail: dto.contact_email ?? '',
    declaredCreditCode: dto.declared_credit_code ?? '',
    chamberLevelId: dto.chamber_level_id,
    chamberLevelName: dto.chamber_level_name,
    chamberLevelExpireAt: dto.chamber_level_expire_at,
    updatedAt: dto.updated_at,
    version: dto.version,
  }
}

export function mapCurrentChamberCertification(
  dto: CurrentChamberEnterpriseDto,
): ChamberCertification | null {
  if (!dto.chamber_level_id || !dto.chamber_level_name) return null
  return {
    certificationId: `${dto.enterprise_id}:${dto.chamber_level_id}`,
    affiliationId: dto.enterprise_id,
    enterpriseId: dto.enterprise_id,
    enterpriseName: dto.name,
    levelCode: dto.chamber_level_id,
    levelName: dto.chamber_level_name,
    validFrom: dto.created_at,
    validUntil: dto.chamber_level_expire_at ?? dto.updated_at,
    status: dto.status === 'enabled' ? 'active' : 'inactive_affiliation',
    platformVerificationStatus: dto.is_verified ? 'verified' : 'unverified',
  }
}
