// Plain-language copy generated from state, so chat, progress and results never disagree.

import type { OutcomeState, ProcessState, Requirement, StageId } from '../types'
import { STATUS } from './vocabulary'
import { lc, shortName } from './format'
import { unresolved, type BusinessView } from './evaluate'

export const PROCESS_LABEL: Record<ProcessState, string> = {
  ready: 'Ready',
  discovering: 'Finding businesses',
  contacting: 'Calling businesses',
  evaluating: 'Checking answers against your request',
  completed: 'Research finished',
  interrupted: 'Paused',
  failed: 'Couldn’t run',
  cancelled: 'Stopped by you',
}

export const PROCESS_CHIP: Record<ProcessState, string> = {
  ready: 'Ready', discovering: 'In progress', contacting: 'In progress', evaluating: 'In progress',
  completed: 'Completed', interrupted: 'Paused', failed: 'Failed', cancelled: 'Stopped',
}

export const STAGE_TITLE: Record<StageId, { active: string; done: string; idle: string }> = {
  discover: { active: 'Discovering businesses', done: 'Businesses discovered', idle: 'Discover businesses' },
  contact: { active: 'Calling businesses', done: 'Calls finished', idle: 'Call businesses' },
  evaluate: { active: 'Checking answers', done: 'Answers checked', idle: 'Check answers' },
}

/** The must-have that is still open for the most promising businesses. */
export function topOpenRequirement(bvs: BusinessView[]): Requirement | null {
  const counts = new Map<string, { r: Requirement; n: number }>()
  bvs
    .filter((b) => b.suitability === 'potential' || b.suitability === 'insufficient')
    .forEach((b) =>
      unresolved(b.views)
        .filter((v) => v.requirement.kind === 'must_have')
        .forEach((v) => {
          const c = counts.get(v.requirement.id) ?? { r: v.requirement, n: 0 }
          c.n += b.suitability === 'potential' ? 2 : 1 // weight the closest options
          counts.set(v.requirement.id, c)
        }),
    )
  return [...counts.values()].sort((a, b) => b.n - a.n)[0]?.r ?? null
}

const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export function outcomeCopy(outcome: OutcomeState, process: ProcessState, bvs: BusinessView[]) {
  const n = (s: BusinessView['suitability']) => bvs.filter((b) => b.suitability === s).length
  switch (outcome) {
    case 'suitable_options_found': {
      const k = n('suitable')
      const suitable = bvs.filter((b) => b.suitability === 'suitable')
      const unknownExtras = [...new Set(suitable.flatMap((b) => b.views.filter((v) => v.requirement.kind === 'informational' && !v.satisfied).map((v) => lc(v.requirement.short))))]
      const extras = unknownExtras.length ? ` ${cap1(listJoin(unknownExtras))} ${unknownExtras.length > 1 ? 'are' : 'is'} still unknown.` : ''
      return { title: `${k} option${k > 1 ? 's meet' : ' meets'} your must-haves`, body: `Confirmed on calls.${extras} Answers reflect what the business said at the time, so check how recent they are before you go.` }
    }
    case 'partial_options_only': {
      const k = n('potential')
      return {
        title: 'No exact match confirmed yet',
        body: `${k === 1 ? 'One business is' : `${k} businesses are`} worth following up with.`,
      }
    }
    case 'no_suitable_option_found':
      return { title: 'None of these can do what you asked', body: 'Every business Aurora checked fails at least one of your must-haves.' }
    case 'unable_to_verify':
      return { title: 'Nothing confirmed yet', body: 'Aurora found businesses, but couldn’t establish your must-haves. A missed or unclear call isn’t a no.' }
    case 'no_businesses_found':
      return { title: 'No businesses found', body: 'Aurora didn’t find any business likely to help with this request.' }
    case 'not_yet_evaluated':
      if (process === 'interrupted') return { title: 'Search paused before it finished', body: 'Answers received so far are saved. Resume to finish calling and checking.' }
      if (process === 'cancelled') return { title: 'You stopped the search', body: 'Answers received before you stopped are saved. You can resume at any time.' }
      if (process === 'failed') return { title: 'This search couldn’t run', body: 'Nothing was found or called.' }
      return { title: 'Still searching', body: 'Results aren’t checked against your request until all calls finish. Early answers may change.' }
  }
}

/** One-line explanation of where a business stands, built from its requirement views. */
export function businessSummary(b: BusinessView): string {
  const musts = b.views.filter((v) => v.requirement.kind === 'must_have')
  const ok = musts.filter((v) => v.display === 'confirmed')
  const failed = musts.filter((v) => v.display === 'not_met')
  const open = musts.filter((v) => !ok.includes(v) && !failed.includes(v))
  if (b.contact.state === 'not_attempted' && b.views.every((v) => v.display === 'not_checked'))
    return 'Found by Aurora but not called, so nothing has been checked yet.'
  const parts: string[] = []
  if (failed.length) parts.push(`Fails: ${failed.map((v) => v.requirement.short).join(', ')}.`)
  if (ok.length) parts.push(`Confirmed: ${ok.map((v) => v.requirement.short).join(', ')}.`)
  if (open.length)
    parts.push(`Open: ${open.map((v) => `${v.requirement.short} (${STATUS[v.display].label.toLowerCase()})`).join(', ')}.`)
  if (!parts.length) return 'Nothing established yet.'
  return parts.join(' ')
}

export type NextAction =
  | { kind: 'followup'; label: string; detail: string; preselect: string[]; tone: 'primary' }
  | { kind: 'details'; label: string; detail?: string; tone: 'primary' | 'quiet' }
  | null

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/**
 * One contextual action per business, named after what it will actually do, with a one-line
 * explanation of what Aurora will ask. Never starts a call by itself – every follow-up goes to review.
 */
export function nextAction(b: BusinessView): NextAction {
  const name = shortName(b.business.name)
  if (b.suitability === 'suitable')
    return { kind: 'details', label: 'Review option', detail: 'Every must-have is confirmed. Check the answers and their times before you go.', tone: 'primary' }
  if (b.suitability === 'not_suitable') return { kind: 'details', label: 'View details', tone: 'quiet' }
  const open = unresolved(b.views)
  if (!open.length) return null
  const openMusts = open.filter((v) => v.requirement.kind === 'must_have')
  const conflicts = openMusts.filter((v) => v.display === 'conflicting')
  const target = openMusts.length ? openMusts : open
  const preselect = target.map((v) => v.requirement.id)
  const names = target.map((v) => lc(v.requirement.short))
  if (conflicts.length)
    return {
      kind: 'followup',
      label: 'Resolve discrepancy',
      detail: `Sources disagree on ${list(conflicts.map((v) => lc(v.requirement.short)))}. Aurora can ask ${name} directly — you approve first.`,
      preselect: conflicts.map((v) => v.requirement.id),
      tone: 'primary',
    }
  if (b.contact.state === 'not_attempted')
    return { kind: 'followup', label: 'Ask Aurora to call', detail: `${name} hasn’t been called. Aurora would ask about ${list(names)} — you approve first.`, preselect, tone: 'primary' }
  if (!b.contact.reached)
    return {
      kind: 'followup',
      label: 'Retry call',
      detail: `${b.contact.attempts} call${b.contact.attempts === 1 ? ' wasn’t' : 's weren’t'} answered. Aurora would ask about ${list(names)} — you approve first.`,
      preselect,
      tone: 'primary',
    }
  const first = target[0].requirement.short
  const label = target.length === 1 ? `Ask about ${lc(first)}` : `Ask about ${target.length} open items`
  return { kind: 'followup', label, detail: `Aurora would call ${name} back and ask only about ${list(names)} — you approve first.`, preselect, tone: 'primary' }
}

const openMustCount = (b: BusinessView) => unresolved(b.views).filter((v) => v.requirement.kind === 'must_have').length

/**
 * The business worth acting on first – only when the evidence actually singles one out.
 * Suitable beats possible; among possible options, fewer open must-haves wins, but a tie means
 * "no clear front-runner" (Aurora's rank is never used to break it). Unverified businesses are never suggested.
 */
export function suggestedBusiness(bvs: BusinessView[]): BusinessView | null {
  const suitable = bvs.filter((b) => b.suitability === 'suitable')
  if (suitable.length === 1) return suitable[0]
  if (suitable.length > 1) return null
  const potential = [...bvs.filter((b) => b.suitability === 'potential')].sort((a, b) => openMustCount(a) - openMustCount(b))
  if (potential.length === 1) return potential[0]
  if (potential.length > 1 && openMustCount(potential[0]) < openMustCount(potential[1])) return potential[0]
  return null
}

/** Conditions attached to a business's current evidence – shown prominently, never hidden in a row. */
export function keyConditions(b: BusinessView): { requirement: string; condition: string }[] {
  const seen = new Set<string>()
  const out: { requirement: string; condition: string }[] = []
  b.views.forEach((v) => {
    if (v.display !== 'conditional') return
    v.current.forEach((e) => {
      if (e.condition && !seen.has(e.condition)) {
        seen.add(e.condition)
        out.push({ requirement: v.requirement.short, condition: e.condition })
      }
    })
  })
  return out
}
