interface AccountRecordLike {
  raw?: Record<string, unknown>
}

export function isEnterpriseAccountRecord(
  record: AccountRecordLike,
  staffOrganizationIds: ReadonlySet<string>,
) {
  const enterprise = record.raw?.enterprise
  if (!enterprise || typeof enterprise !== 'object' || Array.isArray(enterprise)) return true

  const organization = enterprise as Record<string, unknown>
  const subjectType = String(organization.subject_type ?? organization.type ?? '')
  if (subjectType) return subjectType === 'company' || subjectType === 'enterprise'

  const enterpriseId = String(organization.id ?? '')
  return !staffOrganizationIds.has(enterpriseId)
}
