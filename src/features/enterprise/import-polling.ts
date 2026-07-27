import type { ImportJobStatus } from '@/lib/types'

export const IMPORT_POLL_DELAYS_MS = [
  2_000,
  2_000,
  3_000,
  3_000,
  5_000,
  5_000,
  8_000,
  8_000,
  10_000,
  10_000,
] as const

const terminalStatuses = new Set<ImportJobStatus>([
  'completed',
  'partial_failed',
  'failed',
])

export function isTerminalImportJobStatus(status: ImportJobStatus) {
  return terminalStatuses.has(status)
}

export function nextImportPollDelay(attempt: number): number | null {
  return IMPORT_POLL_DELAYS_MS[attempt] ?? null
}
