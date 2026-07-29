import { describe, expect, it } from 'vitest'
import { loginHrefForWorkspaceRole, loginPortals } from './login-portals'

describe('management login portals', () => {
  it('defines one unique entry for every management role', () => {
    expect(loginPortals.map((portal) => portal.id)).toEqual([
      'admin',
      'operator',
      'chamber',
    ])
    expect(new Set(loginPortals.map((portal) => portal.href)).size).toBe(loginPortals.length)
  })

  it('keeps all entries under the shared management origin', () => {
    for (const portal of loginPortals) {
      expect(portal.href).toMatch(/^\/(admin|operation|chamber)\/login$/)
    }
  })

  it('returns each workspace role to its dedicated login entry', () => {
    expect(loginHrefForWorkspaceRole('platform_admin')).toBe('/admin/login')
    expect(loginHrefForWorkspaceRole('platform_operator')).toBe('/operation/login')
    expect(loginHrefForWorkspaceRole('chamber_admin')).toBe('/chamber/login')
  })
})
