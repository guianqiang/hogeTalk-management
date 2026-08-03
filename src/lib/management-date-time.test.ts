import { describe, expect, it } from 'vitest'
import { formatManagementDateTime } from './management-date-time'

describe('management date time', () => {
  it('renders API timestamps as an exact Shanghai local date and time', () => {
    expect(formatManagementDateTime('2026-08-03T02:30:45Z')).toBe('2026-08-03 10:30:45')
  })
})
