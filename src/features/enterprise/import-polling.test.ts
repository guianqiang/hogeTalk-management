import { describe, expect, it } from 'vitest'
import {
  IMPORT_POLL_DELAYS_MS,
  isTerminalImportJobStatus,
  nextImportPollDelay,
} from './import-polling'

describe('enterprise import polling', () => {
  it('stops polling after a bounded customer-visible waiting period', () => {
    expect(IMPORT_POLL_DELAYS_MS.reduce((total, delay) => total + delay, 0)).toBe(56_000)
    expect(nextImportPollDelay(0)).toBe(2_000)
    expect(nextImportPollDelay(IMPORT_POLL_DELAYS_MS.length)).toBeNull()
  })

  it.each(['completed', 'partial_failed', 'failed'] as const)(
    'recognizes %s as a terminal job status',
    (status) => {
      expect(isTerminalImportJobStatus(status)).toBe(true)
    },
  )

  it.each(['uploaded', 'validating', 'applying'] as const)(
    'keeps %s in the processing flow',
    (status) => {
      expect(isTerminalImportJobStatus(status)).toBe(false)
    },
  )
})
