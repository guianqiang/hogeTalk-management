import type { ChamberMembership, Enterprise, Workspace } from './types'

const chamberEnterpriseIds: Record<string, string> = {
  'chamber-singapore': 'ent-002',
  'chamber-malaysia': 'ent-003',
}

export function enterprisesVisibleToWorkspace(
  workspace: Workspace | undefined,
  enterprises: Enterprise[],
  chamberMemberships: ChamberMembership[],
) {
  if (!workspace || workspace.kind === 'platform') return enterprises
  const chamberEnterpriseId = chamberEnterpriseIds[workspace.id]
  const memberEnterpriseIds = new Set(
    chamberMemberships
      .filter((item) => item.chamberId === workspace.id && !['rejected', 'withdrawn', 'terminated'].includes(item.status))
      .map((item) => item.enterpriseId),
  )
  return enterprises.filter((item) => item.id === chamberEnterpriseId || memberEnterpriseIds.has(item.id))
}
