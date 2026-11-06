import type { Evidence, StageId, StageSnapshot, StageStatus, TimelineStep, ProcessState } from '../types'

let n = 0
/** Compact evidence builder. ids are stable because fixtures are built in a fixed order. */
export function ev(
  businessId: string,
  requirementId: string,
  e: Omit<Evidence, 'id' | 'businessId' | 'requirementId' | 'round'> & { round?: number },
): Evidence {
  n += 1
  return { id: `${businessId}-${requirementId}-${n}`, businessId, requirementId, round: 0, ...e }
}

export function step(
  process: ProcessState,
  d: [StageStatus, string],
  c: [StageStatus, string],
  e: [StageStatus, string],
  note?: string,
): TimelineStep {
  const s = (x: [StageStatus, string]): StageSnapshot => ({ status: x[0], detail: x[1] })
  const stages: Record<StageId, StageSnapshot> = { discover: s(d), contact: s(c), evaluate: s(e) }
  return { process, stages, note }
}

/** IST timestamp on 3 Nov 2026 – the date of the observed iPhone test. */
export const nov3 = (hhmm: string) => `2026-11-03T${hhmm}:00+05:30`
