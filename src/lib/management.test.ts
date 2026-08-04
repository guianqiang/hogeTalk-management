import { describe, expect, it } from 'vitest'
import {
  chamberAffiliationSchema,
  managementAuthSessionSchema,
  managementMeSchema,
} from '@/api/generated/huameng'
import {
  cursorPageSchema,
  enterpriseClaimSchema,
  staffAssignmentSchema,
  verificationApplicationSchema,
} from '@/api/generated/huameng-platform'
import { mapAffiliation, mapWorkspace } from '@/api/mappers/management'
import { managementAccountDisplayName } from './management'
import { navigationForWorkspace } from './navigation'

const websiteContentMenuKeys = [
  'content_home',
  'content_news',
  'content_tour',
  'content_education',
  'content_investment',
  'content_supply_chain',
  'content_associations',
  'content_activities',
  'content_parks',
  'content_article_categories',
  'content_countries',
  'content_site_settings',
] as const

describe('frozen management contract projection', () => {
  it('accepts the real personnel and chamber administrator response including grants', () => {
    const result = cursorPageSchema(staffAssignmentSchema).parse({
      items: [{
        staff_assignment_id: '342583346817138701',
        enterprise_id: '342583346817138689',
        membership_id: '342583346817138699',
        account_id: '342583346817138697',
        username: 'chamber_admin',
        display_name: '商会管理员',
        masked_phone: '138****0000',
        title: '秘书长',
        role_template: 'chamber_admin',
        status: 'active',
        grants: [{
          reviewer_grant_id: '342583346817138703',
          action: 'chamber.manage',
          scope_type: 'chamber',
          scope_id: '342583346817138689',
          country_code: null,
          valid_from: '2026-08-03T02:30:00Z',
          valid_to: null,
        }],
        menu_keys: ['dashboard', 'chamber_management'],
        must_change_password: false,
        joined_at: '2026-08-03T02:30:00Z',
        last_active_at: null,
        version: 1,
      }],
      page: { next_cursor: null, has_more: false },
    })

    expect(result.items[0]?.grants).toEqual([
      expect.objectContaining({ action: 'chamber.manage', scope_type: 'chamber' }),
    ])
  })

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

  it('maps the chamber title and effective menu projection', () => {
    const workspace = mapWorkspace({
      enterprise_id: 'ent_chamber0001',
      membership_id: 'mem_member00001',
      staff_assignment_id: 'sta_staff000001',
      subject_type: 'chamber',
      legal_name: '新加坡中华总商会',
      display_name: '新加坡总商会',
      country_code: 'SG',
      role_template: 'chamber_admin',
      title: '秘书长',
      menu_keys: ['dashboard', 'chamber_management', 'account_governance', 'audit_export'],
    })

    expect(workspace.staffAssignmentId).toBe('sta_staff000001')
    expect(workspace.staffTitle).toBe('秘书长')
    expect(workspace.menuKeys).toEqual([
      'dashboard',
      'chamber_management',
      'account_governance',
      'audit_export',
    ])
    expect(navigationForWorkspace(workspace).flatMap((group) => group.items).map((item) => item.label)).toEqual([
      '工作台',
      '会员单位',
      '等级设置',
      '后台人员',
      '操作审计',
    ])
  })

  it('projects the platform admin menu from resolved effective menu keys', () => {
    const workspace = mapWorkspace({
      enterprise_id: 'ent_platform0001',
      membership_id: 'mem_member00002',
      staff_assignment_id: 'sta_staff000002',
      subject_type: 'platform',
      legal_name: '华盟平台',
      display_name: '华盟',
      country_code: 'CN',
      role_template: 'platform_admin',
      title: '平台主管',
      menu_keys: [
        'dashboard',
        'enterprise_auth',
        'chamber_management',
        'content_management',
        ...websiteContentMenuKeys,
        'product_management',
        'inquiry_cooperation',
        'account_governance',
        'billing_governance',
        'audit_export',
      ],
    })

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
    expect(labels).not.toContain('业务通知')
    expect(labels).toHaveLength(25)
  })

  it('distinguishes content and governance operators only by effective menu keys', () => {
    const contentWorkspace = mapWorkspace({
      enterprise_id: 'ent_platform0002',
      membership_id: 'mem_member00003',
      staff_assignment_id: 'sta_staff000003',
      subject_type: 'platform',
      legal_name: '华盟平台',
      display_name: '华盟',
      country_code: 'CN',
      role_template: 'platform_operator',
      title: '内容运营',
      menu_keys: [
        'content_management',
        ...websiteContentMenuKeys,
        'audit_export',
      ],
    })
    const governanceWorkspace = mapWorkspace({
      enterprise_id: 'ent_platform0002',
      membership_id: 'mem_member00004',
      staff_assignment_id: 'sta_staff000004',
      subject_type: 'platform',
      legal_name: '华盟平台',
      display_name: '华盟',
      country_code: 'CN',
      role_template: 'platform_operator',
      title: '企业与商会运营',
      menu_keys: ['enterprise_auth', 'chamber_management', 'audit_export'],
    })

    const contentLabels = navigationForWorkspace(contentWorkspace)
      .flatMap((group) => group.items)
      .map((item) => item.label)
    const governanceLabels = navigationForWorkspace(governanceWorkspace)
      .flatMap((group) => group.items)
      .map((item) => item.label)

    expect(contentWorkspace.staffTitle).toBe('内容运营')
    expect(contentLabels).toContain('首页管理')
    expect(contentLabels).toContain('近期活动')
    expect(contentLabels).not.toContain('业务通知')
    expect(contentLabels).toContain('操作审计')
    expect(contentLabels).not.toContain('企业管理')
    expect(contentLabels).not.toContain('商会管理')
    expect(contentLabels).not.toContain('运营概览')

    expect(governanceWorkspace.staffTitle).toBe('企业与商会运营')
    expect(governanceLabels).toContain('企业管理')
    expect(governanceLabels).toContain('商会管理')
    expect(governanceLabels).toContain('平台认证')
    expect(governanceLabels).toContain('认领审核')
    expect(governanceLabels).toContain('操作审计')
    expect(governanceLabels).not.toContain('新闻中心')
    expect(governanceLabels).not.toContain('近期活动')
    expect(governanceLabels).not.toContain('运营概览')
  })

  it('rejects role or capability claims in a management token response', () => {
    const result = managementAuthSessionSchema.safeParse({
      access_token: 'access',
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
      must_change_password: false,
      enterprise: {
        enterprise_id: 'ent_platform0001',
        membership_id: 'mem_member00001',
        staff_assignment_id: 'sta_staff000001',
        subject_type: 'platform',
        legal_name: '华盟在线平台',
        display_name: '华盟平台',
        country_code: 'CN',
        role_template: 'platform_admin',
        title: '平台主管',
        menu_keys: [
          'dashboard',
          'enterprise_auth',
          'chamber_management',
          'content_management',
          ...websiteContentMenuKeys,
          'product_management',
          'inquiry_cooperation',
          'account_governance',
          'billing_governance',
          'audit_export',
        ],
      },
    })

    expect(me.enterprise.enterprise_id).toBe('ent_platform0001')
    expect(me.must_change_password).toBe(false)
    expect(me.enterprise.title).toBe('平台主管')
    expect(me.enterprise.menu_keys).toContain('enterprise_auth')
  })

  it('fails closed when /me omits the effective menu projection', () => {
    const result = managementMeSchema.safeParse({
      account_id: 'acc_account0001',
      enterprise: {
        enterprise_id: 'ent_platform0001',
        membership_id: 'mem_member00001',
        staff_assignment_id: 'sta_staff000001',
        subject_type: 'platform',
        legal_name: '华盟在线平台',
        display_name: '华盟平台',
        country_code: 'CN',
        role_template: 'platform_operator',
        title: '内容运营',
      },
    })

    expect(result.success).toBe(false)
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
        title: '平台主管',
        menu_keys: [
          'dashboard',
          'enterprise_auth',
          'chamber_management',
          'content_management',
          ...websiteContentMenuKeys,
          'product_management',
          'inquiry_cooperation',
          'account_governance',
          'billing_governance',
          'audit_export',
        ],
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
