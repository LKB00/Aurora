// Requirement-evaluation rules.
//
// These rules are the prototype's own, explicit and documented. They are NOT Aurora's ranking
// algorithm and they never produce or change a match percentage. Aurora's displayed rank and
// match score are shown untouched, as fixture data.
//
// Rules (brief §7, §19.3):
//  • No evidence → "Not checked". Never "does not meet".
//  • A missed call adds a call record but no evidence, so it can never make a business unsuitable.
//  • A different variant is an *alternative*: it is shown, but never counts as meeting the requirement.
//  • A "yes" with a condition (inspection pending, drop-off only…) is "Conditional" (fit = partial).
//  • A promise to check is "Awaiting confirmation" (fit = unknown).
//  • Two pieces of evidence in the same round that disagree → "Conflicting" (fit = unknown).
//  • Newer rounds (follow-ups) supersede older ones for that requirement only; history is kept.
//  • Prices are compared with the current budget, so a budget change re-assesses known prices.
//  • Time-sensitive evidence older than STALE_HOURS is flagged "May be out of date".
//  • A business is "Suitable" only if every must-have is *satisfied*: it meets, the evidence is fresh and attributed,
//    and – for stock, slots, pickup and prices – it came directly from the business. A website or map listing is shown
//    as "Reported by another source" and never establishes live stock, an appointment slot or the final price.
//    Listings may satisfy only requirements that don't change by the hour and carry no price (e.g. payment methods).

import type {
  Business,
  CallRecord,
  ContactOutcome,
  Evidence,
  FitState,
  OutcomeState,
  ProcessState,
  Requirement,
} from '../types'

import { byTime } from './format'

/** A PROTOTYPE ASSUMPTION, not a validated freshness policy: real stock can change in minutes and a slot can go in an hour. It only demonstrates ageing. The time an answer was last checked is always shown beside volatile facts. */
export const STALE_HOURS = 12

export type DisplayStatus =
  | 'confirmed' // business stated it (or simulated business answer)
  | 'listed' // website / directory lists it
  | 'conditional'
  | 'not_met'
  | 'awaiting'
  | 'conflicting'
  | 'unanswered' // asked, but the answer wasn't established
  | 'not_checked'
  | 'no_answer' // calls were tried but nobody picked up – still says nothing about fit
  | 'unattributed' // shown on Aurora's result, source not visible
  | 'outdated'
  | 'not_applicable'

export interface RequirementView {
  requirement: Requirement
  fit: FitState
  display: DisplayStatus
  /** The evidence the current status rests on (null when nothing is known). */
  primary: Evidence | null
  /** Every item in the latest round (2+ when conflicting). */
  current: Evidence[]
  /** Older rounds, newest first – shown as history, never deleted. */
  history: Evidence[]
  alternative?: string
  stale: boolean
  /** This requirement can only be settled by the business itself: volatile facts (stock, slots, pickup) and any price. */
  needsDirect: boolean
  /** Meets the requirement with fresh, attributed evidence of the kind the requirement needs. The one definition everything uses. */
  satisfied: boolean
}

/** Volatile facts and prices must come from the business; a listing can't establish them. */
export const needsDirectEvidence = (req: Requirement) => !!req.timeSensitive || req.budget != null

export interface EvalContext {
  now: string
  budget?: number
}

const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 36e5

/** The fit a single piece of evidence implies, after applying budget and condition rules. */
export function effectiveFit(ev: Evidence, req: Requirement, ctx: EvalContext): FitState {
  let fit = ev.fit
  const budget = ctx.budget ?? req.budget
  if (budget != null && ev.priceValue != null && req.budget != null) {
    fit = ev.priceValue <= budget ? 'meets' : 'does_not_meet'
  }
  if (fit === 'meets' && ev.condition) fit = 'partial'
  if (ev.status === 'source_unclear') fit = 'unknown' // a claim we can't attribute is not verified
  if (ev.status === 'awaiting_confirmation') fit = 'unknown'
  return fit
}

const definitive = (f: FitState) => f !== 'unknown'

export function evaluateRequirement(
  req: Requirement,
  evidence: Evidence[],
  ctx: EvalContext,
): RequirementView {
  const items = evidence.filter((e) => e.requirementId === req.id)
  if (items.length === 0) {
    return { requirement: req, fit: 'unknown', display: 'not_checked', primary: null, current: [], history: [], stale: false, needsDirect: needsDirectEvidence(req), satisfied: false }
  }
  const latestRound = Math.max(...items.map((e) => e.round))
  const current = items.filter((e) => e.round === latestRound)
  const history = items.filter((e) => e.round !== latestRound).sort((a, b) => b.round - a.round)
  const alternative = current.find((e) => e.alternative)?.alternative

  const fits = current.map((e) => effectiveFit(e, req, ctx))
  // Conflict: an explicit conflict flag, or two items in the same round where at least one is
  // definitive and they disagree (e.g. transcript says "6:30 PM works", summary says "not confirmed").
  // Alternatives and promises-to-check don't contradict anything – they are additional context.
  const comparable = current
    .map((e, i) => ({ e, f: fits[i] }))
    .filter(({ e }) => !e.alternative && !['awaiting_confirmation', 'source_unclear', 'not_applicable'].includes(e.status))
  const hasExplicitConflict = current.some((e) => e.status === 'conflicting')
  const disagree =
    comparable.some(({ f }) => definitive(f)) && new Set(comparable.map(({ f }) => f)).size > 1
  if (hasExplicitConflict || disagree) {
    return { requirement: req, fit: 'unknown', display: 'conflicting', primary: current[0], current, history, alternative, stale: false, needsDirect: needsDirectEvidence(req), satisfied: false }
  }

  // Primary: a definitive item first, then a promise to check, then whatever exists.
  const idx =
    fits.findIndex(definitive) >= 0
      ? fits.findIndex(definitive)
      : current.findIndex((e) => e.status === 'awaiting_confirmation') >= 0
        ? current.findIndex((e) => e.status === 'awaiting_confirmation')
        : current.findIndex((e) => !e.alternative) >= 0
          ? current.findIndex((e) => !e.alternative)
          : 0
  const primary = current[idx]
  const fit = fits[idx]

  let display: DisplayStatus
  if (primary.status === 'source_unclear') display = 'unattributed'
  else if (primary.status === 'not_applicable') display = 'not_applicable'
  else if (primary.status === 'awaiting_confirmation') display = 'awaiting'
  else if (fit === 'does_not_meet') display = 'not_met'
  else if (fit === 'partial') display = 'conditional'
  else if (fit === 'meets') display = primary.status === 'website_listed' || primary.source === 'app_or_directory' ? 'listed' : 'confirmed'
  else display = 'unanswered'

  const stale =
    !!req.timeSensitive &&
    definitive(fit) &&
    primary.obtainedAt != null &&
    hoursBetween(primary.obtainedAt, ctx.now) > STALE_HOURS
  if (stale) display = 'outdated'

  const needsDirect = needsDirectEvidence(req)
  // Confirmed = the business said it. Listed = a website / directory shows it. Only a listing for a requirement that
  // doesn't need direct evidence may satisfy it – and it still reads as "Reported by another source", never "Confirmed".
  const satisfied = fit === 'meets' && !stale && (display === 'confirmed' || (display === 'listed' && !needsDirect))
  return { requirement: req, fit, display, primary, current, history, alternative, stale, needsDirect, satisfied }
}

/* ---------- Business level ---------- */

export type Suitability = 'suitable' | 'potential' | 'not_suitable' | 'insufficient'

export function classifyBusiness(views: RequirementView[]): Suitability {
  const musts = views.filter((v) => v.requirement.kind === 'must_have')
  if (musts.some((v) => v.fit === 'does_not_meet')) return 'not_suitable'
  if (
    musts.length > 0 &&
    musts.every((v) => v.satisfied)
  )
    return 'suitable'
  if (musts.some((v) => v.fit === 'meets' || v.fit === 'partial' || v.alternative || v.display === 'awaiting'))
    return 'potential'
  return 'insufficient'
}

/** Requirements still worth asking about: everything that isn't satisfied (so a listing for stock, a slot or a price stays open). */
export function unresolved(views: RequirementView[]): RequirementView[] {
  return views.filter((v) => !v.satisfied && v.display !== 'not_met' && v.display !== 'not_applicable')
}

/* ---------- Contact ---------- */

export interface ContactSummary {
  state: ContactOutcome
  attempts: number
  answered: number // calls that connected to a conversation
  reached: boolean
  last: CallRecord | null
}

export function contactSummary(calls: CallRecord[]): ContactSummary {
  const sorted = [...calls].sort((a, b) => byTime(a.at, b.at))
  const last = sorted.at(-1) ?? null
  const answered = calls.filter((c) => ['answered', 'completed_with_information', 'completed_insufficient_information'].includes(c.outcome)).length
  return { state: last?.outcome ?? 'not_attempted', attempts: calls.length, answered, reached: answered > 0, last }
}

/* ---------- Search outcome ---------- */

/**
 * Process completion never implies success: the outcome is computed from business suitability,
 * and is "not yet evaluated" until the evaluation stage has run.
 */
export function searchOutcome(
  process: ProcessState,
  evaluated: boolean,
  businesses: { suitability: Suitability; contact: ContactSummary }[],
): OutcomeState {
  if (!evaluated) return 'not_yet_evaluated'
  if (businesses.length === 0) return process === 'completed' ? 'no_businesses_found' : 'not_yet_evaluated'
  if (businesses.some((b) => b.suitability === 'suitable')) return 'suitable_options_found'
  if (businesses.some((b) => b.suitability === 'potential')) return 'partial_options_only'
  // "No suitable option" only when evidence rules out every business; if some are simply
  // unverified, the honest answer is "unable to verify".
  if (businesses.every((b) => b.suitability === 'not_suitable')) return 'no_suitable_option_found'
  return 'unable_to_verify'
}

export interface BusinessView {
  business: Business
  views: RequirementView[]
  suitability: Suitability
  contact: ContactSummary
  calls: CallRecord[]
}

export function buildBusinessView(
  business: Business,
  requirements: Requirement[],
  evidence: Evidence[],
  calls: CallRecord[],
  ctx: EvalContext,
): BusinessView {
  const ev = evidence.filter((e) => e.businessId === business.id)
  const own = calls.filter((c) => c.businessId === business.id)
  // Calls were tried but nobody picked up: say so, instead of "not checked". Fit stays unknown.
  const tried = own.length > 0 && !own.some((c) => ['answered', 'completed_with_information', 'completed_insufficient_information'].includes(c.outcome))
  const views = requirements
    .map((r) => evaluateRequirement(r, ev, ctx))
    .map((v) => (tried && v.display === 'not_checked' ? { ...v, display: 'no_answer' as const } : v))
  return { business, views, suitability: classifyBusiness(views), contact: contactSummary(own), calls: own }
}
