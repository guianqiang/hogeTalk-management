import type { WorkspaceRole } from '@/lib/types'

export type LoginPortal = 'admin' | 'operator' | 'chamber' | 'enterprise'

export interface LoginPortalSummary {
  id: LoginPortal
  href: string
  eyebrow: string
  title: string
  description: string
}

export const loginPortals: LoginPortalSummary[] = [
  {
    id: 'admin',
    href: '/admin/login',
    eyebrow: '平台管理员',
    title: '治理与权限管理',
    description: '管理平台人员、审核边界与关键治理事项。',
  },
  {
    id: 'operator',
    href: '/operation/login',
    eyebrow: '平台运营',
    title: '业务运营工作台',
    description: '处理企业、内容、认证与日常运营任务。',
  },
  {
    id: 'chamber',
    href: '/chamber/login',
    eyebrow: '商会管理员',
    title: '商会组织门户',
    description: '维护会员企业、商会认证与组织协作信息。',
  },
  {
    id: 'enterprise',
    href: '/enterprise/login',
    eyebrow: '企业账号',
    title: '企业工作台',
    description: '维护企业供需信息、合作咨询与企业 AI 名片。',
  },
]

const loginPortalByWorkspaceRole = {
  platform_admin: 'admin',
  platform_operator: 'operator',
  chamber_admin: 'chamber',
  enterprise_owner: 'enterprise',
  enterprise_admin: 'enterprise',
  enterprise_member: 'enterprise',
} satisfies Record<WorkspaceRole, LoginPortal>

export function loginHrefForWorkspaceRole(role: WorkspaceRole): string {
  const portalId = loginPortalByWorkspaceRole[role]
  return loginPortals.find((portal) => portal.id === portalId)?.href ?? '/login'
}
