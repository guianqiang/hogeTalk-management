import type { ManagementMenuKey } from '@/api/generated/huameng'
import type { Workspace } from './types'

export type ManagementNavIcon =
  | 'dashboard'
  | 'enterprise'
  | 'account'
  | 'membership'
  | 'audit'
  | 'review'
  | 'verification'
  | 'duplicate'
  | 'dispute'
  | 'content'
  | 'globe'
  | 'settings'
  | 'partner'

export interface ManagementNavItem {
  href: string
  label: string
  note: string
  icon: ManagementNavIcon
  menuKey: ManagementMenuKey
}

export interface ManagementNavGroup {
  label: string
  items: ManagementNavItem[]
}

const platformNavigation: ManagementNavGroup[] = [
  {
    label: '运营',
    items: [
      { href: '', label: '运营概览', note: '平台运营概览', icon: 'dashboard', menuKey: 'dashboard' },
    ],
  },
  {
    label: '网站内容',
    items: [
      { href: '/legacy/home', label: '首页管理', note: '管理首页内容', icon: 'content', menuKey: 'content_management' },
      { href: '/legacy/news', label: '新闻中心', note: '管理新闻资讯', icon: 'content', menuKey: 'content_management' },
      { href: '/legacy/tour', label: '文化旅游', note: '管理文旅内容', icon: 'content', menuKey: 'content_management' },
      { href: '/legacy/education', label: '教育交流', note: '管理教育交流内容', icon: 'content', menuKey: 'content_management' },
      { href: '/legacy/investment', label: '经贸合作', note: '管理经贸合作内容', icon: 'content', menuKey: 'content_management' },
      { href: '/legacy/supply-chain', label: '供应链平台', note: '管理供应链内容', icon: 'enterprise', menuKey: 'content_management' },
      { href: '/legacy/associations', label: '商协会', note: '管理商协会内容', icon: 'membership', menuKey: 'content_management' },
      { href: '/legacy/activities', label: '近期活动', note: '管理活动信息', icon: 'content', menuKey: 'activity_operations' },
      { href: '/legacy/parks', label: '东盟园区', note: '管理园区内容', icon: 'enterprise', menuKey: 'content_management' },
    ],
  },
  {
    label: '组织与撮合',
    items: [
      { href: '/enterprises', label: '企业管理', note: '维护企业主体及相关资料', icon: 'enterprise', menuKey: 'enterprise_auth' },
      { href: '/legacy/chambers', label: '商会管理', note: '管理商会主体', icon: 'membership', menuKey: 'chamber_management' },
      { href: '/legacy/inquiries', label: '线索管理', note: '管理企业合作线索', icon: 'partner', menuKey: 'inquiry_cooperation' },
    ],
  },
  {
    label: '审核与治理',
    items: [
      { href: '/verifications', label: '平台认证', note: '审核企业 L1–L3 平台认证', icon: 'verification', menuKey: 'enterprise_auth' },
      { href: '/claims', label: '认领审核', note: '处理企业认领申请', icon: 'review', menuKey: 'enterprise_auth' },
      { href: '/duplicates', label: '重复企业', note: '核查疑似重复主体', icon: 'duplicate', menuKey: 'enterprise_auth' },
      { href: '/disputes', label: '所有权争议', note: '处理企业控制权争议', icon: 'dispute', menuKey: 'enterprise_auth' },
    ],
  },
  {
    label: '站点与字典',
    items: [
      { href: '/legacy/partners', label: '合作伙伴', note: '管理合作伙伴', icon: 'partner', menuKey: 'inquiry_cooperation' },
      { href: '/legacy/product-categories', label: '商品分类', note: '管理商品分类', icon: 'content', menuKey: 'product_management' },
      { href: '/legacy/article-categories', label: '资讯栏目', note: '管理资讯栏目', icon: 'content', menuKey: 'content_management' },
      { href: '/legacy/countries', label: '国家管理', note: '管理国家与地区', icon: 'globe', menuKey: 'content_management' },
      { href: '/legacy/site-settings', label: '站点配置', note: '管理站点设置', icon: 'settings', menuKey: 'content_management' },
    ],
  },
  {
    label: '系统',
    items: [
      { href: '/account-members', label: '后台人员', note: '管理后台人员和授权范围', icon: 'account', menuKey: 'account_governance' },
      { href: '/legacy/plans', label: '套餐与权益', note: '管理套餐、权益与配额规则', icon: 'settings', menuKey: 'billing_governance' },
      { href: '/legacy/notifications', label: '业务通知', note: '查看风险提醒和业务通知', icon: 'content', menuKey: 'notification_center' },
      { href: '/audit', label: '操作审计', note: '追溯管理端业务操作', icon: 'audit', menuKey: 'audit_export' },
    ],
  },
]

const chamberNavigation: ManagementNavGroup[] = [
  {
    label: '总览',
    items: [
      { href: '', label: '工作台', note: '商会运营概览', icon: 'dashboard', menuKey: 'dashboard' },
    ],
  },
  {
    label: '我的商会',
    items: [
      { href: '/enterprises', label: '会员单位', note: '会员单位与批量导入', icon: 'enterprise', menuKey: 'chamber_management' },
      { href: '/chamber-members', label: '等级设置', note: '认证等级与有效期', icon: 'membership', menuKey: 'chamber_management' },
      { href: '/account-members', label: '后台人员', note: '管理商会后台账号', icon: 'account', menuKey: 'account_governance' },
      { href: '/audit', label: '操作审计', note: '追溯商会后台操作', icon: 'audit', menuKey: 'audit_export' },
    ],
  },
]

export function navigationForWorkspace(workspace: Workspace): ManagementNavGroup[] {
  const groups = workspace.kind === 'platform' ? platformNavigation : chamberNavigation

  return groups.flatMap((group) => {
    const items = group.items.filter((item) => workspace.menuKeys.includes(item.menuKey))
    return items.length ? [{ ...group, items }] : []
  })
}
