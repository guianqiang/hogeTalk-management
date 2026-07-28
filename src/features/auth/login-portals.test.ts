import { describe, expect, it } from 'vitest'
import { loginPortals } from './login-portals'

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
})
