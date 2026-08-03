import { describe, expect, it } from 'vitest'

import config from './next.config.mjs'
import { managementLoginBackendBody } from './src/api/server/management-login.ts'

describe('Next.js development origins', () => {
  it('allows the local HogeTalk management domain', () => {
    expect(config.allowedDevOrigins).toContain('hogetalk_local.aihoge.com')
  })
})

describe('management login BFF contract', () => {
  it('forwards one identifier field for account names and phone numbers', () => {
    expect(managementLoginBackendBody({
      identifier: ' 13800138000 ',
      country_code: 'CN',
      password: 'HogeTalk2026!',
    })).toEqual({
      identifier: '13800138000',
      country_code: 'CN',
      password: 'HogeTalk2026!',
    })
  })
})
