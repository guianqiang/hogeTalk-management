import { NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'
import type { ManagementAuthSessionDto } from '@/api/generated/huameng'
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  clearSessionCookies,
  setSessionCookies,
  validCsrf,
} from './session'

const session: ManagementAuthSessionDto = {
  access_token: 'header.payload.signature',
  token_type: 'Bearer',
  expires_in: 28_800,
  account: {
    id: 'acc_test',
    status: 'active',
    display_name: '测试账号',
    created_at: '2026-08-04T00:00:00Z',
  },
  context: {
    type: 'management',
    account_id: 'acc_test',
  },
}

describe('management JWT cookies', () => {
  it('stores only the JWT access session and expires CSRF with the same TTL', () => {
    const response = NextResponse.json({ ok: true })
    setSessionCookies(response, session, 'csrf-value')

    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe(session.access_token)
    expect(response.cookies.get(CSRF_COOKIE)?.value).toBe('csrf-value')
    expect(response.cookies.get('hm_management_refresh')?.value).toBe('')
  })

  it('clears access, CSRF and any legacy refresh cookie on logout', () => {
    const response = new NextResponse(null, { status: 204 })
    clearSessionCookies(response)

    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe('')
    expect(response.cookies.get(CSRF_COOKIE)?.value).toBe('')
    expect(response.cookies.get('hm_management_refresh')?.value).toBe('')
  })

  it('requires the standard CSRF header for mutating BFF requests', () => {
    const request = new Request('http://localhost/api/management/me', {
      headers: { 'X-Management-CSRF': 'csrf-value' },
    })
    expect(validCsrf(request, 'csrf-value')).toBe(true)
    expect(validCsrf(request, 'other')).toBe(false)
  })
})
