// Product model for the prototype.
// Five concepts are kept apart on purpose (brief §7):
//   1. Requirement      – what the user asked for, and how much it matters
//   2. Fit              – does the business appear to meet it? (derived, never stored on the business)
//   3. Evidence         – what was said / listed, by which source, when
//   4. Contact (calls)  – what happened when Aurora tried to reach the business
//   5. Search process + outcome – is the research finished, and did it find something suitable?

/* ---------- 1. Requirements ---------- */

export type RequirementKind = 'must_have' | 'preference' | 'informational'

export interface Requirement {
  id: string
  label: string // "iPhone 17 Pro, 256GB"
  short: string // "256GB" – used in compact rows
  kind: RequirementKind
  question: string // what Aurora would ask in a follow-up call
  budget?: number // set on the budget requirement; price evidence is re-evaluated against it
  timeSensitive?: boolean // stock / slots / pickup go stale; payment methods do not
}

/* ---------- 2. Fit ---------- */

export type FitState = 'meets' | 'partial' | 'does_not_meet' | 'unknown'

/* ---------- 3. Evidence ---------- */

export type SourceType =
  | 'business_call' // what the business said on a call
  | 'website' // listed on a website
  | 'app_or_directory' // maps / directory listing
  | 'user_provided'
  | 'aurora_display' // shown on Aurora's result card; original source not visible in the research
  | 'prototype_simulation' // invented for this demo – never presented as a real event

export type EvidenceStatus =
  | 'business_stated'
  | 'website_listed'
  | 'awaiting_confirmation'
  | 'not_checked'
  | 'insufficient_information'
  | 'conflicting'
  | 'outdated'
  | 'not_applicable'
  | 'source_unclear'

export type Origin = 'observed' | 'simulated'

export interface Evidence {
  id: string
  businessId: string
  requirementId: string
  /** 0 = original search; 1, 2… = follow-up calls. Newer rounds supersede older ones for that requirement only. */
  round: number
  source: SourceType
  status: EvidenceStatus
  /** What this piece of evidence, on its own, says about the requirement. */
  fit: FitState
  /** Plain-language statement, as close to the source as possible. */
  statement: string
  /** A caveat that keeps a "yes" from being unconditional (inspection pending, drop-off only…). */
  condition?: string
  /** How the claim was established. Absent = derived from sourceDetail. */
  basis?: 'stated' | 'summary' | 'transcript' | 'calculated' | 'displayed'
  /** A limitation of the source itself (noisy line, unclear transcript). Shown wherever the claim is. */
  caveat?: string
  /** Itemised facts inside one statement (e.g. a price breakdown), shown as a list. */
  details?: string[]
  /** A different variant / option offered instead. Never counted as an exact match. */
  alternative?: string
  /** Numeric price, so a budget change can re-assess without inventing anything. */
  priceValue?: number
  /** ISO time the evidence was obtained, or null when the record doesn't show one. */
  obtainedAt: string | null
  /** Where in the source this came from ("AI summary", "Call transcript", "Result card"). */
  sourceDetail?: string
  callId?: string
  origin: Origin
}

/* ---------- 4. Contact ---------- */

export type ContactOutcome =
  | 'not_attempted'
  | 'queued'
  | 'calling'
  | 'answered'
  | 'no_answer'
  | 'busy'
  | 'declined'
  | 'technical_failure'
  | 'completed_insufficient_information'
  | 'completed_with_information'
  | 'cancelled'

export interface TranscriptLine {
  speaker: 'aurora' | 'business'
  text: string
  at?: string // "00:04"
}

export interface CallRecord {
  id: string
  businessId: string
  kind: 'original' | 'follow_up'
  outcome: ContactOutcome
  at: string | null // ISO, null if unknown
  duration?: string // as displayed, e.g. "1m 1s"
  summary: string[] // AI summary lines, verbatim where observed
  transcript?: TranscriptLine[]
  transcriptNote?: string
  /** Requirement ids asked about (follow-ups only). */
  asked?: string[]
  origin: Origin
}

/** Non-call activity shown in Aurora's activity log ("Located on Maps"). */
export interface ActivityEvent {
  id: string
  businessId: string
  label: string
  at: string | null
  origin: Origin
}

/* ---------- Business ---------- */

export interface Business {
  id: string
  name: string
  address?: string // only when shown in the source
  addressNote?: string
  /** SIMULATED straight-line distance from the search area. The source data has no distance, so this is a placeholder shown with a "simulated" label. */
  distanceKm?: number
  /** Sources disagree about where the business is. Shown as a visible warning, never silently resolved. */
  addressDiscrepancy?: string
  rating?: { value: number; note: string }
  /** Aurora's own displayed rank and match score – stored as-is, never recalculated. */
  auroraRank?: number
  auroraMatch?: number
  website?: string
  /** Claims Aurora's own result card displayed – kept separate from attributed evidence. */
  displayedClaims?: string[]
  initial: string // neutral placeholder avatar – no fabricated logos
  /** Step of the live-search timeline at which this business's original evidence becomes visible. */
  revealStep: number
  origin: Origin
}

/** Businesses that appeared in Aurora's lists but whose answers are not in the research record. */
export interface ListedBusiness {
  name: string
  shownStatus: string // what Aurora's list showed, e.g. "Done"
}

/* ---------- 5. Search ---------- */

export type ProcessState =
  | 'ready'
  | 'discovering'
  | 'contacting'
  | 'evaluating'
  | 'completed'
  | 'interrupted'
  | 'failed'
  | 'cancelled'

export type OutcomeState =
  | 'suitable_options_found'
  | 'partial_options_only'
  | 'no_suitable_option_found'
  | 'unable_to_verify'
  | 'no_businesses_found'
  | 'not_yet_evaluated'

export type StageId = 'discover' | 'contact' | 'evaluate'
export type StageStatus = 'pending' | 'active' | 'done' | 'stopped' | 'skipped' | 'failed'

export interface StageSnapshot {
  status: StageStatus
  detail: string // shown under the stage title
}

/** One step of the deterministic live-search timeline. */
export interface TimelineStep {
  process: ProcessState
  stages: Record<StageId, StageSnapshot>
  note?: string // shown for interrupted / failed / cancelled
}

export interface SearchRequest {
  title: string // "Apple iPhone 17 Pro"
  location: string // "Sector 3"
  text: string // the user's own words
  acknowledgement: string // Aurora's first reply
  /** Shown when the wording is reconstructed rather than the user's verbatim message. */
  note?: string
  /** Images the user attached to the request. */
  attachments?: { src: string; alt: string }[]
  /** How Aurora read the request – shown back to the user as structured criteria they can check. */
  interpretation: { label: string; value: string; note?: string }[]
}

export type FollowUpMode = 'answered' | 'no_answer' | 'partial' | 'conflicting' | 'failed'

export interface FollowUpAnswer {
  fit: FitState
  status: EvidenceStatus
  statement: string
  condition?: string
  alternative?: string
  priceValue?: number
}

export interface FollowUpScript {
  outcome: ContactOutcome
  duration?: string
  summary: string[]
  transcript?: TranscriptLine[]
  /** Only requirements the user selected AND that appear here get new evidence. */
  answers: Record<string, FollowUpAnswer | FollowUpAnswer[]>
}

export type RecoveryAction =
  | { kind: 'edit_request' }
  | { kind: 'resume' }
  | { kind: 'load_scenario'; scenarioId: string; label: string }

export interface Scenario {
  id: string
  /** Opens on the start screen (the request is drafted, not yet sent) instead of in the middle of the search. */
  intro?: boolean
  group: 'Observed journeys' | 'Follow-up outcomes' | 'Recovery & edge states'
  name: string
  description: string
  /** What in this scenario is simulated – shown in the demo menu and the banner. */
  simulatedNote: string
  isSimulatedSearch: boolean
  request: SearchRequest
  requirements: Requirement[]
  businesses: Business[]
  calls: CallRecord[]
  activity: ActivityEvent[]
  evidence: Evidence[]
  listed: ListedBusiness[]
  listedNote: string
  /** Aurora's displayed counters. Kept as displayed; never combined or reconciled. */
  countsNote?: string
  /** Non-business sources Aurora looked at (websites), only where the research captured them. */
  sources?: { kind: 'website'; label: string; detail: string }[]
  timeline: TimelineStep[]
  startStep: number
  now: string // the scenario's "current time"
  followUpMode: FollowUpMode
  scripts: Record<string, Partial<Record<FollowUpMode, FollowUpScript>>>
  /** Extra explanation + recovery actions when the outcome is a dead end. */
  recovery?: { title: string; body: string; preserved: string; actions: RecoveryAction[] }
}
