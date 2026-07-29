import { describe, expect, it } from 'vitest'
import {
  chamberAffiliationSchema,
  managementAuthSessionSchema,
  managementMeSchema,
} from '@/api/generated/huameng'
import {
  enterpriseClaimSchema,
  verificationApplicationSchema,
} from '@/api/generated/huameng-platform'
import { mapAffiliation, mapWorkspace } from '@/api/mappers/management'
import { managementAccountDisplayName } from './management'
import { navigationForWorkspace } from './navigation'

describe('frozen management contract projection', () => {
  it('uses the saved management account display name instead of the role fallback', () => {
    expect(managementAccountDisplayName(
      { display_name: '华盟平台管理员123' },
      '华盟平台管理员',
    )).toBe('华盟平台管理员123')

    expect(managementAccountDisplayName(
      { display_name: '   ' },
      '华盟平台管理员',
    )).toBe('华盟平台管理员')
  })

  it('maps chamber workspaces only to W1/W2 capabilities', () => {
    const workspace = mapWorkspace({
      enterprise_id: 'ent_chamber0001',
      membership_id: 'mem_member00001',
      staff_assignment_id: 'sta_staff000001',
      subject_type: 'chamber',
      legal_name: '新加坡中华总商会',
      display_name: '新加坡总商会',
      country_code: 'SG',
      role_template: 'chamber_admin',
    })

    expect(workspace.capabilities).toEqual([
      'dashboard.read',
      'enterprise.read',
      'enterprise.create',
      'chamber_membership.read',
      'staff.manage',
      'audit.read',
    ])
    expect(workspace.staffAssignmentId).toBe('sta_staff000001')
    expect(navigationForWorkspace(workspace).flatMap((group) => group.items).map((item) => item.label)).toEqual([
      '工作台',
      '会员单位',
      '等级设置',
      '后台人员',
      '操作审计',
    ])
  })

  it('projects the platform admin menu from the documented role template', () => {
    const workspace = mapWorkspace({
      enterprise_id: 'ent_platform0001',
      membership_id: 'mem_member00002',
      staff_assignment_id: 'sta_staff000002',
      subject_type: 'platform',
      legal_name: '华盟平台',
      display_name: '华盟',
      country_code: 'CN',
      role_template: 'platform_admin',
    })

    expect(workspace.capabilities).toEqual([
      'dashboard.read',
      'enterprise.verify',
      'claim.review',
      'duplicate.review',
      'dispute.review',
      'staff.manage',
      'audit.read',
    ])
    const labels = navigationForWorkspace(workspace)
      .flatMap((group) => group.items)
      .map((item) => item.label)

    expect(labels).toContain('运营概览')
    expect(labels).toContain('首页管理')
    expect(labels).toContain('企业管理')
    expect(labels).toContain('平台认证')
    expect(labels).toContain('认领审核')
    expect(labels).toContain('后台人员')
    expect(labels).toContain('操作审计')
    expect(labels).toHaveLength(26)
  })

  it('keeps platform operators out of staff management navigation', () => {
    const workspace = mapWorkspace({
      enterprise_id: 'ent_platform0002',
      membership_id: 'mem_member00003',
      staff_assignment_id: 'sta_staff000003',
      subject_type: 'platform',
      legal_name: '华盟平台',
      display_name: '华盟',
      country_code: 'CN',
      role_template: 'platform_operator',
    })

    const labels = navigationForWorkspace(workspace)
      .flatMap((group) => group.items)
      .map((item) => item.label)

    expect(labels).toContain('运营概览')
    expect(labels).toContain('新闻中心')
    expect(labels).toContain('线索管理')
    expect(labels).toContain('商品分类')
    expect(labels).not.toContain('后台人员')
    expect(labels).not.toContain('首页管理')
    expect(labels).not.toContain('企业管理')
    expect(labels).not.toContain('认领审核')
    expect(labels).not.toContain('合作伙伴')
    expect(labels).toContain('操作审计')
    expect(labels).toHaveLength(15)
  })

  it('rejects role or capability claims in a management token response', () => {
    const result = managementAuthSessionSchema.safeParse({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
      expires_in: 900,
      account: {
        id: 'acc_account0001',
        status: 'active',
        display_name: '管理员',
        created_at: '2026-07-25T00:00:00Z',
      },
      context: {
        type: 'management',
        account_id: 'acc_account0001',
        role: 'platform_admin',
      },
    })

    expect(result.success).toBe(false)
  })

  it('projects the current single-enterprise management identity', () => {
    const me = managementMeSchema.parse({
      account_id: 'acc_account0001',
      enterprise: {
        enterprise_id: 'ent_platform0001',
        membership_id: 'mem_member00001',
        staff_assignment_id: 'sta_staff000001',
        subject_type: 'platform',
        legal_name: '华盟在线平台',
        display_name: '华盟平台',
        country_code: 'CN',
        role_template: 'platform_admin',
      },
    })

    expect(me.enterprise.enterprise_id).toBe('ent_platform0001')
  })

  it('temporarily normalizes the running legacy workspace response to one enterprise', () => {
    const me = managementMeSchema.parse({
      account_id: 'acc_account0001',
      preferred_workspace_id: 'ent_platform0001',
      workspaces: [{
        workspace_id: 'ent_platform0001',
        membership_id: 'mem_member00001',
        staff_assignment_id: 'sta_staff000001',
        subject_type: 'platform',
        legal_name: '华盟在线平台',
        display_name: '华盟平台',
        country_code: 'CN',
        role_template: 'platform_admin',
      }],
    })

    expect(me.enterprise.enterprise_id).toBe('ent_platform0001')
  })

  it('preserves the platform-unverified projection on chamber affiliations', () => {
    const dto = chamberAffiliationSchema.parse({
      affiliation_id: 'aff_relation0001',
      chamber_id: 'ent_chamber0001',
      enterprise_id: 'ent_company0001',
      enterprise_name: '示例企业',
      status: 'active',
      joined_at: '2026-07-25T00:00:00Z',
      platform_verification_status: 'unverified',
      version: 1,
    })

    expect(mapAffiliation(dto).platformVerificationStatus).toBe('unverified')
  })

  it('accepts claim queue rows with intentionally omitted evidence details', () => {
    const claim = enterpriseClaimSchema.parse({
      id: 'clm_claim000001',
      enterprise_id: 'ent_company0001',
      claimant_account_id: 'acc_account0001',
      status: 'submitted',
      risk_level: 'medium',
      evidence: null,
      reviewer_note: null,
      created_at: '2026-07-27T00:00:00Z',
      updated_at: '2026-07-27T00:00:00Z',
    })

    expect(claim.evidence).toBeNull()
  })

  it('validates the platform verification queue contract', () => {
    const application = verificationApplicationSchema.parse({
      id: 'vfa_verification0001',
      enterprise_id: 'ent_company0001',
      enterprise: {
        id: 'ent_company0001',
        legal_name: '示例企业有限公司',
        display_name: '示例企业',
        country_code: 'CN',
        type: 'company',
        lifecycle_status: 'active',
        verification_status: 'pending',
        ownership_status: 'claimed',
        directory_visibility: 'private',
        created_at: '2026-07-27T00:00:00Z',
      },
      applicant_account_id: 'acc_account0001',
      requested_level: 'L2',
      approved_level: null,
      revision: 1,
      status: 'submitted',
      statement: '申请平台认证',
      required_items: [],
      reviewer_note: null,
      valid_until: null,
      evidence: [],
      submitted_at: '2026-07-27T00:00:00Z',
      updated_at: '2026-07-27T00:00:00Z',
    })

    expect(application.requested_level).toBe('L2')
    expect(application.enterprise.verification_status).toBe('pending')
  })
})
