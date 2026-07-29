export type ManagementScopeType = 'platform' | 'country' | 'chamber' | 'enterprise'

interface PermissionMeta {
  label: string
  group: string
  description: string
}

const permissionMetaByAction: Record<string, PermissionMeta> = {
  'management.access': {
    label: '进入管理后台',
    group: '人员与组织',
    description: '允许进入当前组织的管理后台。',
  },
  'staff.invite': {
    label: '邀请后台人员',
    group: '人员与组织',
    description: '邀请新人员加入后台。',
  },
  'staff.manage': {
    label: '管理人员与权限',
    group: '人员与组织',
    description: '调整岗位、角色和业务授权。',
  },
  'enterprise.import': {
    label: '导入会员企业',
    group: '企业管理',
    description: '批量导入商会会员企业。',
  },
  'enterprise.verify': {
    label: '审核平台认证',
    group: '企业管理',
    description: '处理企业认证申请。',
  },
  'claim.review': {
    label: '审核企业认领',
    group: '企业管理',
    description: '处理企业认领申请。',
  },
  'claim.escalate': {
    label: '发起认领复核',
    group: '企业管理',
    description: '将认领申请升级到二次复核。',
  },
  'duplicate.review': {
    label: '处理重复企业',
    group: '企业管理',
    description: '审核疑似重复的企业主体。',
  },
  'dispute.review': {
    label: '处理所有权争议',
    group: '企业管理',
    description: '处理企业归属与所有权争议。',
  },
  'evidence.read': {
    label: '查看审核材料',
    group: '企业管理',
    description: '查看认领、认证及争议的证明材料。',
  },
  'chamber.manage': {
    label: '管理商会资料',
    group: '商会管理',
    description: '新建、编辑和维护商会主体。',
  },
  'chamber.member.manage': {
    label: '管理商会会员',
    group: '商会管理',
    description: '维护商会与会员企业的关系。',
  },
  'chamber.certification.manage': {
    label: '管理会员等级',
    group: '商会管理',
    description: '维护商会会员认证等级。',
  },
  'content.manage': {
    label: '编辑网站内容',
    group: '内容与站点',
    description: '新建和编辑新闻、专题等内容。',
  },
  'content.publish': {
    label: '发布网站内容',
    group: '内容与站点',
    description: '发布、撤回网站内容。',
  },
  'partner.manage': {
    label: '管理合作伙伴',
    group: '内容与站点',
    description: '维护合作伙伴及展示信息。',
  },
  'country.manage': {
    label: '管理国家字典',
    group: '内容与站点',
    description: '维护国家、地区和旗帜信息。',
  },
  'site.manage': {
    label: '编辑站点配置',
    group: '内容与站点',
    description: '编辑站点名称、联系信息和 SEO。',
  },
  'site.publish': {
    label: '发布站点配置',
    group: '内容与站点',
    description: '将站点配置发布到前台。',
  },
  'home.manage': {
    label: '编辑首页内容',
    group: '内容与站点',
    description: '维护首页栏目和推荐位。',
  },
  'home.publish': {
    label: '发布首页内容',
    group: '内容与站点',
    description: '将首页编排发布到前台。',
  },
  'dashboard.read': {
    label: '查看运营概览',
    group: '运营业务',
    description: '查看运营指标和待办汇总。',
  },
  'activity.read': {
    label: '查看活动',
    group: '运营业务',
    description: '查看活动资料与状态。',
  },
  'activity.registration.read': {
    label: '查看活动报名',
    group: '运营业务',
    description: '查看活动报名人员和记录。',
  },
  'notification.read': {
    label: '查看业务通知',
    group: '运营业务',
    description: '查看系统通知和风险提醒。',
  },
  'account.read': {
    label: '查看用户账号',
    group: '账号与商业化',
    description: '查看账号及其企业归属。',
  },
  'account.manage': {
    label: '管理用户账号',
    group: '账号与商业化',
    description: '调整账号状态和基础信息。',
  },
  'account.session.revoke': {
    label: '下线账号会话',
    group: '账号与商业化',
    description: '撤销指定账号的登录会话。',
  },
  'plan.read': {
    label: '查看套餐',
    group: '账号与商业化',
    description: '查看套餐、价格和权益。',
  },
  'plan.manage': {
    label: '管理套餐',
    group: '账号与商业化',
    description: '新建和维护套餐及权益。',
  },
  'subscription.read': {
    label: '查看企业订阅',
    group: '账号与商业化',
    description: '查看企业当前订阅。',
  },
  'subscription.manage': {
    label: '管理企业订阅',
    group: '账号与商业化',
    description: '开通、变更或终止企业订阅。',
  },
  'quota.read': {
    label: '查看企业额度',
    group: '账号与商业化',
    description: '查看企业各项可用额度。',
  },
  'quota.adjust': {
    label: '调整企业额度',
    group: '账号与商业化',
    description: '人工增加或扣减企业额度。',
  },
  'product.category.manage': {
    label: '管理商品分类',
    group: '商品与线索',
    description: '维护供应链商品分类。',
  },
  'product.review': {
    label: '审核商品',
    group: '商品与线索',
    description: '处理商品审核、补件和驳回。',
  },
  'product.curate': {
    label: '管理商品推荐',
    group: '商品与线索',
    description: '设置商品推荐和展示顺序。',
  },
  'inquiry.manage': {
    label: '处理合作线索',
    group: '商品与线索',
    description: '受理并跟进企业合作咨询。',
  },
  'inquiry.export': {
    label: '导出合作线索',
    group: '商品与线索',
    description: '导出当前授权范围内的线索。',
  },
  'audit.read': {
    label: '查看操作审计',
    group: '安全审计',
    description: '查看后台关键操作记录。',
  },
  'audit.export': {
    label: '导出操作审计',
    group: '安全审计',
    description: '导出当前授权范围内的审计记录。',
  },
}

const unknownPermission: PermissionMeta = {
  label: '其他业务权限',
  group: '其他权限',
  description: '服务端新增的业务权限，请联系平台管理员确认用途。',
}

export function managementPermissionMeta(action: string): PermissionMeta {
  return permissionMetaByAction[action] ?? unknownPermission
}

export function managementScopeLabel(
  scopeType: ManagementScopeType,
  countryCode?: string | null,
) {
  if (scopeType === 'platform') return '全平台'
  if (scopeType === 'country') return countryCode ? `${countryCode.toUpperCase()} 国家或地区` : '指定国家或地区'
  if (scopeType === 'chamber') return '指定商会'
  return '指定企业'
}

export function groupManagementPermissions<T extends { action: string }>(permissions: T[]) {
  const groups = new Map<string, T[]>()
  for (const permission of permissions) {
    const group = managementPermissionMeta(permission.action).group
    groups.set(group, [...(groups.get(group) ?? []), permission])
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }))
}
