import { describe, expect, it } from 'vitest'
import { isEnterpriseAccountRecord } from './account-scope'

describe('enterprise account list scope', () => {
  const staffOrganizationIds = new Set(['ent_platform', 'ent_chamber'])

  it('keeps company accounts and accounts without an organization', () => {
    expect(isEnterpriseAccountRecord({
      raw: { enterprise: { id: 'ent_company', type: 'company' } },
    }, staffOrganizationIds)).toBe(true)
    expect(isEnterpriseAccountRecord({ raw: {} }, staffOrganizationIds)).toBe(true)
  })

  it('excludes platform and chamber staff accounts', () => {
    expect(isEnterpriseAccountRecord({
      raw: { enterprise: { id: 'ent_platform' } },
    }, staffOrganizationIds)).toBe(false)
    expect(isEnterpriseAccountRecord({
      raw: { enterprise: { id: 'ent_chamber', subject_type: 'chamber' } },
    }, staffOrganizationIds)).toBe(false)
  })
})
