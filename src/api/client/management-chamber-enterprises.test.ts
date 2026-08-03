import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createChamberEnterprise,
  createCurrentChamberLevel,
  deleteChamberEnterprise,
  deleteCurrentChamberLevel,
  listCurrentChamberLevels,
  setChamberEnterpriseLevel,
  updateChamberEnterprise,
  updateCurrentChamberLevel,
} from './management'

const enterprise = {
  enterprise_id: '341478560919220900',
  name: '东盟测试会员单位',
  country_code: 'SG',
  subject_type: 'company' as const,
  enterprise_type: 3,
  logo: null,
  avatar_text: null,
  avatar_bg_color: null,
  description: null,
  main_business: null,
  address: null,
  contact_phone: null,
  contact_email: null,
  outlink: null,
  innerlink: null,
  declared_credit_code: null,
  license_img: null,
  legal_person: null,
  contact_name: null,
  chamber_id: '341478560919220224',
  chamber_name: '测试商会',
  industry_id: null,
  is_verified: false,
  vip_level: 0,
  platform_level: 0,
  platform_level_expire_at: null,
  chamber_level_id: null,
  chamber_level_name: null,
  chamber_level_expire_at: null,
  supply_product_count: 0,
  order_count: 0,
  project_count: 0,
  student_count: 0,
  cooperation_school_count: 0,
  route_count: 0,
  deal_count: 0,
  good_rate: 0,
  audit_status: 'pending' as const,
  audit_remark: null,
  audited_at: null,
  audited_by_account_id: null,
  status: 'enabled' as const,
  created_at: '2026-08-03T10:00:00+08:00',
  updated_at: '2026-08-03T10:00:00+08:00',
  version: 1,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('current chamber enterprise management contract', () => {
  it('uses one resource family for manual create, edit, level and delete', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => array.fill(7),
    })
    vi.stubGlobal('document', { cookie: 'hm_management_csrf=test-csrf' })
    const backend = vi.fn(async (_url: string, init?: RequestInit) => (
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(enterprise), {
          status: init?.method === 'POST' ? 201 : 200,
          headers: { 'Content-Type': 'application/json' },
        })
    ))
    vi.stubGlobal('fetch', backend)

    const body = {
      name: enterprise.name,
      country_code: 'SG',
      enterprise_type: 3 as const,
    }
    await createChamberEnterprise(body)
    await updateChamberEnterprise(enterprise.enterprise_id, 1, body)
    await setChamberEnterpriseLevel(enterprise.enterprise_id, 2, '7001', '2027-08-03T23:59:59+08:00')
    await deleteChamberEnterprise(enterprise.enterprise_id)

    expect(backend.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['/api/management/chamber/enterprises', 'POST'],
      [`/api/management/chamber/enterprises/${enterprise.enterprise_id}?expected_version=1`, 'PUT'],
      [`/api/management/chamber/enterprises/${enterprise.enterprise_id}/level`, 'POST'],
      [`/api/management/chamber/enterprises/${enterprise.enterprise_id}`, 'DELETE'],
    ])
    expect(JSON.parse(String((backend.mock.calls[2]?.[1] as RequestInit).body))).toEqual({
      chamber_level_id: '7001',
      expire_at: '2027-08-03T23:59:59+08:00',
      expected_version: 2,
    })
  })

  it('uses the current chamber level resource without a chamber id in the path', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => array.fill(7),
    })
    vi.stubGlobal('document', { cookie: 'hm_management_csrf=test-csrf' })
    const level = { id: '7001', name: '理事单位', sort: 20 }
    const backend = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      return new Response(JSON.stringify(init?.method === 'GET' ? { items: [level] } : level), {
        status: init?.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', backend)

    await listCurrentChamberLevels()
    await createCurrentChamberLevel({ name: level.name, sort: level.sort })
    await updateCurrentChamberLevel(level.id, { name: '常务理事单位', sort: 10 })
    await deleteCurrentChamberLevel(level.id)

    expect(backend.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['/api/management/chamber/levels', 'GET'],
      ['/api/management/chamber/levels', 'POST'],
      ['/api/management/chamber/levels/7001', 'PUT'],
      ['/api/management/chamber/levels/7001', 'DELETE'],
    ])
  })
})
