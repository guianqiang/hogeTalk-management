import type {
  ManagementMenuKey,
  MenuCatalogDto,
} from '@/api/generated/huameng-platform'

export type StaffRoleTemplate = 'platform_admin' | 'platform_operator' | 'chamber_admin'

export function defaultStaffTitle(roleTemplate: StaffRoleTemplate) {
  if (roleTemplate === 'platform_admin') return '平台管理员'
  if (roleTemplate === 'platform_operator') return '运营人员'
  return '商会管理员'
}

export function staffMenuSummary(
  roleTemplate: StaffRoleTemplate,
  menuKeys: readonly ManagementMenuKey[],
  catalog: MenuCatalogDto['items'],
) {
  if (roleTemplate === 'platform_admin') return ['全部菜单']
  if (roleTemplate === 'chamber_admin') return ['商会全部管理功能']

  const labels = menuKeys.map((key) => (
    catalog.find((item) => item.menu_key === key)?.display_name ?? key
  ))
  return labels.length > 0 ? labels : ['尚未分配可见菜单']
}

export function validOperatorMenuKeys(
  menuKeys: readonly ManagementMenuKey[],
  catalog: MenuCatalogDto['items'],
) {
  const allowed = new Set(catalog.map((item) => item.menu_key))
  return [...new Set(menuKeys)].filter((key) => allowed.has(key))
}
