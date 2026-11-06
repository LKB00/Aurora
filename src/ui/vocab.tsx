// Aurora's evidence vocabulary expressed in Tattva's own colour roles.
// Domain words stay in logic/vocabulary.ts; this file only decides which Tattva Badge tone carries each one.
//
//   success  = a business said it on a call          unsure = partly known (conditional, awaiting, conflicting, out of date)
//   danger   = the evidence says it is not met        neutral = nothing known yet (not reached, not checked, not enough)
//   info     = another source reports it              celebrate = a goal fully reached (used once: "meets your must-haves")
//   attention (amber) = a person has to act — used on rows only where a follow-up can settle the question.
import { AISummarizeIcon, ApproveIcon, Badge, NeedsReviewIcon, XIcon } from '@tattva/ui'
import type { ComponentProps } from 'react'
import type { DisplayStatus, Suitability } from '../logic/evaluate'
import { STATUS } from '../logic/vocabulary'

type Tone = NonNullable<ComponentProps<typeof Badge>['tone']>

export const STATUS_TONE: Record<DisplayStatus, Tone> = {
  confirmed: 'success',
  listed: 'info',
  conditional: 'unsure',
  conflicting: 'unsure',
  awaiting: 'unsure',
  outdated: 'unsure',
  unattributed: 'unsure',
  not_met: 'danger',
  unanswered: 'neutral',
  no_answer: 'neutral',
  not_checked: 'neutral',
  not_applicable: 'neutral',
}

export const statusLabel = (s: DisplayStatus) => STATUS[s].label

export const SUITABILITY_COPY: Record<Suitability, { label: string; tone: Tone; group: string; note: string }> = {
  suitable: { label: 'Meets your must-haves', tone: 'celebrate', group: 'Meets your must-haves', note: 'Aurora confirmed every must-have on a call.' },
  potential: { label: 'Possible option', tone: 'unsure', group: 'Possible options', note: 'Looks promising, but a few must-haves still need confirming.' },
  insufficient: { label: 'Not enough information', tone: 'neutral', group: 'Not enough information', note: 'No clear answers yet, so these could still work.' },
  not_suitable: { label: 'Doesn’t meet a must-have', tone: 'danger', group: 'Doesn’t meet a must-have', note: 'At least one must-have isn’t available here.' },
}

export const SUITABILITY_ORDER: Suitability[] = ['suitable', 'potential', 'insufficient', 'not_suitable']

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{statusLabel(status)}</Badge>
}

export function SuitabilityBadge({ value }: { value: Suitability }) {
  const s = SUITABILITY_COPY[value]
  return <Badge tone={s.tone}>{s.label}</Badge>
}

// What each answer says on a card or row, in everyday words (the full evidence wording stays in the evidence itself).
export const CARD_LABEL: Record<DisplayStatus, string> = {
  confirmed: 'Confirmed',
  listed: 'Listed online',
  conditional: 'Depends',
  conflicting: 'Sources disagree',
  awaiting: 'Waiting to hear',
  outdated: 'Old answer',
  unattributed: 'Unverified',
  not_met: 'Not available',
  unanswered: 'Not answered',
  no_answer: 'Not reached',
  not_checked: 'Not asked yet',
  not_applicable: 'Doesn’t apply',
}

/** A tick = confirmed, cross = not available, "i" = partly known, empty ring = nothing known yet. */
export function StatusGlyph({ status }: { status: DisplayStatus }) {
  const tone = STATUS_TONE[status]
  if (tone === 'info') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 self-center text-fg-muted"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  if (tone === 'success') return <ApproveIcon width={16} height={16} className="shrink-0 self-center text-success" />
  if (tone === 'danger') return <XIcon width={16} height={16} className="shrink-0 self-center text-danger" />
  if (tone === 'unsure') return <NeedsReviewIcon width={16} height={16} className="shrink-0 self-center text-unsure-fg" />
  return <span aria-hidden className="inline-block size-3.5 shrink-0 self-center rounded-full border-2 border-line-strong" />
}

// The icon tile that fronts an outcome. Only good news is green. Everything else stays calm (soft lime or neutral): "not yet" is not a warning, and red or orange here only creates worry.
export const VERDICT_TILE = {
  suitable_options_found: { icon: <AISummarizeIcon width={20} height={20} />, tile: 'bg-lime-soft text-fg' },
  partial_options_only: { icon: <AISummarizeIcon width={20} height={20} />, tile: 'bg-lime-soft text-fg' },
  no_suitable_option_found: { icon: <AISummarizeIcon width={20} height={20} />, tile: 'bg-sunken text-fg' },
} as const
export const verdictTile = (outcome: string) => VERDICT_TILE[outcome as keyof typeof VERDICT_TILE] ?? { icon: <AISummarizeIcon width={20} height={20} />, tile: 'bg-sunken text-fg-muted' }
