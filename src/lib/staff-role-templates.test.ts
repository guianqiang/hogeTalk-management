import { describe, expect, it } from 'vitest'
import {
  defaultStaffTitle,
  staffMenuSummary,
  validOperatorMenuKeys,
} from './staff-role-templates'

const catalog = [
  {
    menu_key: 'dashboard' as const,
    display_name: '运营概览',
    description: '查看运营概览',
    route: '/dashboard',
  },
  {
    menu_key: 'content_management' as const,
    display_name: '内容管理',
    description: '管理平台内容',
    route: '/content',
  },
]

describe('staff role templates', () => {
  it('uses fixed business-facing titles', () => {
    expect(defaultStaffTitle('platform_admin')).toBe('平台管理员')
    expect(defaultStaffTitle('platform_operator')).toBe('运营人员')
    expect(defaultStaffTitle('chamber_admin')).toBe('商会管理员')
  })

  it('shows menu names rather than internal permission codes', () => {
    expect(staffMenuSummary('platform_operator', ['dashboard'], catalog)).toEqual(['运营概览'])
    expect(staffMenuSummary('platform_admin', [], catalog)).toEqual(['全部菜单'])
    expect(staffMenuSummary('chamber_admin', [], catalog)).toEqual(['商会全部管理功能'])
  })

  it('keeps only unique menu keys in the live catalog', () => {
    expect(validOperatorMenuKeys(
      ['dashboard', 'dashboard', 'audit_export'],
      catalog,
    )).toEqual(['dashboard'])
  })
})
