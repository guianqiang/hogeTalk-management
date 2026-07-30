import type {
  AccountMembership,
  AuditEvent,
  ChamberMembership,
  Enterprise,
  MockDatabase,
  MockUser,
  Workspace,
} from './types'

const platformMenuKeys = [
  'dashboard',
  'enterprise_auth',
  'chamber_management',
  'content_management',
  'product_management',
  'activity_operations',
  'inquiry_cooperation',
  'notification_center',
  'account_governance',
  'billing_governance',
  'audit_export',
] as const

const operatorMenuKeys = [
  'dashboard',
  'content_management',
  'activity_operations',
  'inquiry_cooperation',
  'notification_center',
  'audit_export',
] as const

const chamberMenuKeys = [
  'dashboard',
  'chamber_management',
  'account_governance',
  'audit_export',
] as const

export const workspaces: Workspace[] = [
  {
    id: 'hm-platform',
    name: '华盟在线运营中心',
    shortName: '华盟',
    kind: 'platform',
    role: 'platform_admin',
    staffTitle: '平台主管',
    menuKeys: [...platformMenuKeys],
  },
  {
    id: 'chamber-singapore',
    name: '新加坡江苏商会',
    shortName: '新商会',
    kind: 'chamber',
    role: 'chamber_admin',
    staffTitle: '秘书长',
    menuKeys: [...chamberMenuKeys],
  },
  {
    id: 'chamber-malaysia',
    name: '马来西亚江苏商会',
    shortName: '马商会',
    kind: 'chamber',
    role: 'chamber_admin',
    staffTitle: '秘书长',
    menuKeys: [...chamberMenuKeys],
  },
]

export const mockUsers: MockUser[] = [
  {
    id: 'user-platform-admin',
    name: '陈明远',
    account: 'admin@huameng.cn',
    title: '华盟管理员',
    avatarText: '陈',
    workspaceIds: ['hm-platform', 'chamber-singapore', 'chamber-malaysia'],
  },
  {
    id: 'user-platform-operator',
    name: '林嘉仪',
    account: 'operator@huameng.cn',
    title: '华盟运营',
    avatarText: '林',
    workspaceIds: ['hm-platform'],
  },
  {
    id: 'user-chamber-admin',
    name: '周秘书长',
    account: 'secretary@sgcc.cn',
    title: '商会管理员',
    avatarText: '周',
    workspaceIds: ['chamber-singapore'],
  },
]

const enterprises: Enterprise[] = [
  { id: 'ent-001', name: '华盟在线科技有限公司', shortName: '华盟在线', kind: 'platform', status: 'active', country: '中国', region: '江苏·南京', industry: '数字化服务', contactName: '陈明远', contactPhone: '138****1024', memberCount: 18, chamberCount: 8, updatedAt: '2026-07-23 10:32' },
  { id: 'ent-002', name: '新加坡江苏商会', shortName: '新加坡江苏商会', kind: 'chamber', status: 'active', country: '新加坡', region: '新加坡', industry: '商协会', contactName: '周秘书长', contactPhone: '+65 **** 8821', memberCount: 126, chamberCount: 0, updatedAt: '2026-07-22 16:20' },
  { id: 'ent-003', name: '马来西亚江苏商会', shortName: '马来西亚江苏商会', kind: 'chamber', status: 'active', country: '马来西亚', region: '吉隆坡', industry: '商协会', contactName: '孙秘书长', contactPhone: '+60 **** 3518', memberCount: 98, chamberCount: 0, updatedAt: '2026-07-21 09:48' },
  { id: 'ent-004', name: '江苏澄海新能源科技有限公司', shortName: '澄海新能源', kind: 'company', status: 'active', country: '中国', region: '江苏·无锡', industry: '新能源', contactName: '王成海', contactPhone: '139****6808', memberCount: 6, chamberCount: 2, updatedAt: '2026-07-23 09:15' },
  { id: 'ent-005', name: '星洲智造供应链有限公司', shortName: '星洲智造', kind: 'company', status: 'pending', country: '新加坡', region: '裕廊', industry: '智能制造', contactName: '李文杰', contactPhone: '+65 **** 2109', memberCount: 3, chamberCount: 1, updatedAt: '2026-07-23 08:42' },
  { id: 'ent-006', name: '南洋绿色食品集团', shortName: '南洋食品', kind: 'company', status: 'active', country: '马来西亚', region: '柔佛', industry: '食品加工', contactName: '郑雅雯', contactPhone: '+60 **** 7742', memberCount: 11, chamberCount: 1, updatedAt: '2026-07-20 14:05' },
  { id: 'ent-007', name: '海丝国际物流有限公司', shortName: '海丝物流', kind: 'company', status: 'suspended', country: '中国', region: '福建·厦门', industry: '跨境物流', contactName: '许海峰', contactPhone: '136****3341', memberCount: 4, chamberCount: 1, updatedAt: '2026-07-18 11:36' },
]

const accountMemberships: AccountMembership[] = [
  { id: 'am-001', workspaceId: 'hm-platform', name: '陈明远', account: 'admin@huameng.cn', title: '平台主管', role: 'platform_admin', status: 'active', joinedAt: '2026-06-12', lastActiveAt: '刚刚', version: 3 },
  { id: 'am-002', workspaceId: 'hm-platform', name: '林嘉仪', account: 'operator@huameng.cn', title: '企业运营', role: 'platform_operator', status: 'active', joinedAt: '2026-06-18', lastActiveAt: '12 分钟前', version: 2 },
  { id: 'am-003', workspaceId: 'hm-platform', name: '吴晓敏', account: 'xiaomin@huameng.cn', title: '内容运营', role: 'platform_operator', status: 'suspended', joinedAt: '2026-07-02', lastActiveAt: '3 天前', version: 4 },
  { id: 'am-004', workspaceId: 'chamber-singapore', name: '周秘书长', account: 'secretary@sgcc.cn', title: '秘书长', role: 'chamber_admin', status: 'active', joinedAt: '2026-05-20', lastActiveAt: '8 分钟前', version: 5 },
  { id: 'am-005', workspaceId: 'chamber-singapore', name: '许安琪', account: 'anqi@sgcc.cn', title: '会员服务', role: 'chamber_admin', status: 'active', joinedAt: '2026-06-03', lastActiveAt: '1 小时前', version: 1 },
  { id: 'am-006', workspaceId: 'chamber-malaysia', name: '孙秘书长', account: 'secretary@mjcc.cn', title: '秘书长', role: 'chamber_admin', status: 'active', joinedAt: '2026-05-18', lastActiveAt: '昨天', version: 1 },
]

const chamberMemberships: ChamberMembership[] = [
  { id: 'cm-001', chamberId: 'chamber-singapore', chamberName: '新加坡江苏商会', enterpriseId: 'ent-004', enterpriseName: '江苏澄海新能源科技有限公司', industry: '新能源', contactName: '王成海', level: '卓越会员', status: 'active', submittedAt: '2026-05-08', joinedAt: '2026-05-12', expiresAt: '2027-05-11', version: 2 },
  {
    id: 'cm-002',
    chamberId: 'chamber-singapore',
    chamberName: '新加坡江苏商会',
    enterpriseId: 'ent-005',
    enterpriseName: '星洲智造供应链有限公司',
    industry: '智能制造',
    contactName: '李文杰',
    contactPhone: '+65 **** 2109',
    enterpriseRegion: '新加坡 · 裕廊',
    applicationReason: '希望加入商会供应链协作网络，参与制造业会员交流和跨境采购对接。',
    submittedBy: '李文杰',
    materials: ['企业注册证明', '联系人授权书', '企业简介'],
    level: '优质会员',
    status: 'submitted',
    submittedAt: '2026-07-22',
    version: 1,
  },
  { id: 'cm-003', chamberId: 'chamber-singapore', chamberName: '新加坡江苏商会', enterpriseId: 'ent-006', enterpriseName: '南洋绿色食品集团', industry: '食品加工', contactName: '郑雅雯', level: '基础会员', status: 'active', submittedAt: '2026-03-03', joinedAt: '2026-03-05', expiresAt: '2027-03-04', version: 3 },
  { id: 'cm-004', chamberId: 'chamber-singapore', chamberName: '新加坡江苏商会', enterpriseId: 'ent-007', enterpriseName: '海丝国际物流有限公司', industry: '跨境物流', contactName: '许海峰', level: '优质会员', status: 'suspended', submittedAt: '2025-11-06', joinedAt: '2025-11-10', expiresAt: '2026-11-09', version: 4 },
  { id: 'cm-005', chamberId: 'chamber-malaysia', chamberName: '马来西亚江苏商会', enterpriseId: 'ent-006', enterpriseName: '南洋绿色食品集团', industry: '食品加工', contactName: '郑雅雯', level: '卓越会员', status: 'active', submittedAt: '2026-02-18', joinedAt: '2026-02-20', expiresAt: '2027-02-19', version: 2 },
]

const auditEvents: AuditEvent[] = [
  { id: 'ae-001', workspaceId: 'hm-platform', actorName: '陈明远', action: 'enterprise.create', targetType: '企业', targetName: '星洲智造供应链有限公司', result: 'success', summary: '创建企业主体，状态为待完善', createdAt: '2026-07-23 08:42:16' },
  { id: 'ae-002', workspaceId: 'hm-platform', actorName: '林嘉仪', action: 'membership.invite', targetType: '账号成员', targetName: '吴晓敏', result: 'success', summary: '邀请加入华盟在线运营中心', createdAt: '2026-07-22 17:08:40' },
  { id: 'ae-003', workspaceId: 'chamber-singapore', actorName: '周秘书长', action: 'chamber_membership.approve', targetType: '商会会员企业', targetName: '南洋绿色食品集团', result: 'success', summary: '批准入会申请，会员等级：基础会员', createdAt: '2026-07-22 14:35:09' },
  { id: 'ae-004', workspaceId: 'hm-platform', actorName: '陈明远', action: 'membership.suspend', targetType: '账号成员', targetName: '吴晓敏', result: 'success', summary: '暂停账号成员权限', createdAt: '2026-07-21 18:22:51' },
]

export const initialMockDatabase: MockDatabase = {
  enterprises,
  accountMemberships,
  chamberMemberships,
  auditEvents,
}

export function getWorkspacesForUser(userId: string): Workspace[] {
  const user = mockUsers.find((item) => item.id === userId)
  if (!user) return []

  return user.workspaceIds.flatMap((workspaceId) => {
    const workspace = workspaces.find((item) => item.id === workspaceId)
    if (!workspace) return []
    if (user.id !== 'user-platform-operator' || workspace.id !== 'hm-platform') {
      return [workspace]
    }
    return [{
      ...workspace,
      role: 'platform_operator' as const,
      staffTitle: '内容运营',
      menuKeys: [...operatorMenuKeys],
    }]
  })
}
