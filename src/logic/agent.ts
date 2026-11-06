// The "agent" layer: everything that makes Aurora's work visible is DERIVED from the same state the
// rest of the app reads – the timeline step, visible calls, activity and evidence. Nothing here invents
// an event, a source or a finding; if the research didn't capture something, it isn't shown.

import type { ContactOutcome, Evidence, Requirement, Scenario, TimelineStep } from '../types'
import type { BusinessView, DisplayStatus, RequirementView } from './evaluate'
import { unresolved } from './evaluate'
import { STATUS } from './vocabulary'
import { byTime, lc, shortName } from './format'

/** "Venkateshwara" + "Said it has…" → "Venkateshwara said it has…"; otherwise "Name: statement". */
export const attributed = (name: string, statement: string) =>
  /^(Said|Promised|Offered|Quoted|Confirmed|Can|Didn’t|Asked)\b/.test(statement)
    ? `${name} ${statement.charAt(0).toLowerCase()}${statement.slice(1)}`
    : `${name}: ${statement}`

export { shortName } from './format'

/** “a”, “a and b”, “a, b and c” */
export const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/* ---------- Reading the interpreted request ---------- */

export interface InterpretedItem { label: string; value: string; note?: string }

/** Splits Aurora's reading of a request into what is being searched for, its constraints, and anything that wasn't recorded. */
export function readInterpretation(items: InterpretedItem[]) {
  const [headline, ...rest] = items
  const variant = rest.find((i) => i.label === 'Variant')
  const constraints = rest.filter((i) => i !== variant)
  // Open points come from the data (“Not recorded”), never from a canned reassurance.
  const open = items.filter((i) => /not recorded/i.test(i.value)).map((i) => `${i.label} wasn’t recorded${i.note ? ` — ${i.note}` : ''}.`)
  return { headline, variant, constraints, open }
}

/* ---------- How a claim was established ---------- */

export type Basis = NonNullable<Evidence['basis']> | 'listing' | 'simulated'

export function basisOf(e: Evidence): Basis {
  if (e.origin === 'simulated' && e.source === 'prototype_simulation') return 'simulated'
  if (e.basis) return e.basis
  if (e.source === 'aurora_display') return 'displayed'
  if (e.source === 'app_or_directory') return 'listing'
  if (e.sourceDetail?.startsWith('Call transcript')) return 'transcript'
  if (e.sourceDetail && /summary/i.test(e.sourceDetail)) return 'summary'
  return 'stated'
}

export const BASIS_LABEL: Record<Basis, string> = {
  stated: 'Stated by the business on a call',
  summary: 'From Aurora’s AI summary of the call',
  transcript: 'From the call transcript',
  calculated: 'Calculated from figures the business gave',
  displayed: 'Shown in Aurora’s result – no visible source',
  listing: 'From a map / directory listing',
  simulated: 'Scripted answer to a follow-up you approved — not a real call',
}

/* ---------- Research activity feed ---------- */

export type ActivityKind = 'understand' | 'discovery' | 'website' | 'maps' | 'call_attempt' | 'conversation' | 'finding' | 'evaluation' | 'follow_up'

export interface Activity {
  id: string
  kind: ActivityKind
  text: string
  detail?: string
  at: string | null
  simulated?: boolean
  live?: boolean // the thing Aurora is doing right now
  tone?: 'ok' | 'cond' | 'neutral'
}

/** Contact outcomes where nobody was spoken to. They are different events with different next steps – never one “no answer”. */
const NO_CONTACT = new Set<ContactOutcome>(['no_answer', 'busy', 'declined', 'technical_failure', 'cancelled'])

/** Plain-language result of a call that didn't connect to a conversation. A failed connection is never reported as the business declining. */
export const NO_CONTACT_PHRASE: Partial<Record<ContactOutcome, string>> = {
  no_answer: 'No one answered',
  busy: 'Line was busy',
  declined: 'Call was declined',
  technical_failure: 'Couldn’t connect the call',
  cancelled: 'You cancelled the call',
}

/** Activity-feed line for an original call that didn't reach a conversation. */
export function callAttemptLine(name: string, outcome: ContactOutcome): string {
  switch (outcome) {
    case 'busy': return `Called ${name} — line was busy`
    case 'declined': return `Called ${name} — call was declined`
    case 'technical_failure': return `Tried to call ${name} — couldn’t connect the call`
    case 'cancelled': return `You cancelled the call to ${name}`
    default: return `Called ${name} — no one answered`
  }
}

/** The same, for a follow-up call the user approved. */
export function followUpCallLine(name: string, outcome: ContactOutcome): string {
  const tail: Partial<Record<ContactOutcome, string>> = { no_answer: 'no one answered', busy: 'line was busy', declined: 'call was declined', technical_failure: 'couldn’t connect the call', cancelled: 'you cancelled the call' }
  return `Follow-up call to ${name} — ${tail[outcome] ?? 'no one answered'}`
}

export function buildActivity(s: Scenario, timeline: TimelineStep, bvs: BusinessView[]): Activity[] {
  const out: Activity[] = []
  const must = s.requirements.filter((r) => r.kind === 'must_have').length
  out.push({ id: 'understand', kind: 'understand', at: null, text: 'Understood your request', detail: s.request.interpretation.map((i) => i.value).join(' · ') })

  const disc = timeline.stages.discover
  if (disc.status === 'active') out.push({ id: 'disc', kind: 'discovery', at: null, live: true, text: `Searching maps and websites near ${s.request.location}` })
  if (disc.status === 'done') out.push({ id: 'disc', kind: 'discovery', at: null, text: `Discovery finished: ${disc.detail.replace(' (as shown by Aurora)', '')}`, detail: 'Count as displayed by Aurora' })
  if (disc.status === 'failed') out.push({ id: 'disc', kind: 'discovery', at: null, text: 'Discovery couldn’t start', tone: 'neutral' })
  if (disc.status === 'done' && s.sources?.length)
    out.push({ id: 'web', kind: 'website', at: null, text: `Found ${s.sources.length} websites with product information`, detail: s.sources.map((w) => w.label).join(' · ') })

  // Business-level events, in the order they happened where times exist.
  const timed: Activity[] = []
  bvs.forEach((b) => {
    const name = shortName(b.business.name)
    s.activity
      .filter((a) => a.businessId === b.business.id)
      .forEach((a) => timed.push({ id: a.id, kind: 'maps', at: a.at, text: `${a.label === 'Located on Maps' ? 'Located' : a.label} ${name}${a.label === 'Located on Maps' ? ' on Maps' : ''}` }))
    b.calls
      .filter((c) => c.kind === 'original')
      .forEach((c) => {
        if (NO_CONTACT.has(c.outcome)) timed.push({ id: c.id, kind: 'call_attempt', at: c.at, text: callAttemptLine(name, c.outcome), tone: 'neutral' })
        else if (c.outcome === 'completed_insufficient_information')
          timed.push({ id: c.id, kind: 'conversation', at: c.at, text: `Spoke with ${name}${c.duration ? ` (${c.duration})` : ''} — nothing useful established`, tone: 'neutral' })
        else {
          timed.push({ id: c.id, kind: 'conversation', at: c.at, text: `Spoke with ${name}${c.duration ? ` for ${c.duration}` : ''}` })
          // What that call established – from the evidence it produced, never from imagination.
          const own = b.views.flatMap((v) => [...v.current, ...v.history].map((e) => ({ v, e }))).filter(({ e }) => e.callId === c.id && e.round === 0)
          const told = own.filter(({ e }) => e.status !== 'insufficient_information')
          const silent = own.filter(({ e }) => e.status === 'insufficient_information')
          told.forEach(({ v, e }, i) =>
            timed.push({
              id: `${c.id}-f${i}`,
              kind: 'finding',
              at: c.at,
              text: attributed(name, e.statement),
              tone: e.alternative || e.condition || e.status === 'awaiting_confirmation' ? 'cond' : v.display === 'conflicting' ? 'cond' : 'ok',
            }),
          )
          if (silent.length)
            timed.push({ id: `${c.id}-silent`, kind: 'finding', at: c.at, tone: 'neutral', text: `${name}: not established on the call — ${silent.map(({ v }) => lc(v.requirement.short)).join(', ')}` })
        }
      })
  })
  // Map discoveries without a recorded time happened during discovery, so they lead; everything else follows the clock.
  const rank = (x: Activity) => (x.at ? 1 : x.kind === 'maps' ? 0 : 2)
  out.push(...timed.sort((a, b) => rank(a) - rank(b) || (a.at && b.at ? byTime(a.at, b.at) : 0)))

  const ev = timeline.stages.evaluate
  if (ev.status === 'active') out.push({ id: 'eval', kind: 'evaluation', at: null, live: true, text: `Comparing answers against your ${must} must-haves` })
  if (ev.status === 'done') out.push({ id: 'eval', kind: 'evaluation', at: null, text: `Checked every answer against your ${must} must-haves`, detail: `${bvs.length} business${bvs.length === 1 ? '' : 'es'} reviewed` })

  const contact = timeline.stages.contact
  if (contact.status === 'active' && !out.some((a) => a.live)) out.push({ id: 'calling-now', kind: 'call_attempt', at: null, live: true, text: 'Calling businesses — more answers coming' })

  // Follow-ups the user approved (always simulated in this prototype).
  bvs.forEach((b) => {
    const name = shortName(b.business.name)
    b.calls
      .filter((c) => c.kind === 'follow_up')
      .sort((x, y) => byTime(x.at, y.at))
      .forEach((c) => {
        out.push({
          id: c.id,
          kind: 'follow_up',
          at: c.at,
          simulated: true,
          tone: NO_CONTACT.has(c.outcome) ? 'neutral' : 'ok',
          text: NO_CONTACT.has(c.outcome) ? followUpCallLine(name, c.outcome) : `Follow-up call with ${name}${c.duration ? ` (${c.duration})` : ''}`,
          detail: c.asked?.length ? `You approved asking about: ${c.asked.map((id) => lc(s.requirements.find((r) => r.id === id)?.short ?? '')).join(', ')}` : undefined,
        })
        b.views
          .flatMap((v) => v.current.filter((e) => e.callId === c.id).map((e) => ({ v, e })))
          .forEach(({ v, e }, i) =>
            out.push({ id: `${c.id}-f${i}`, kind: 'finding', at: c.at, simulated: true, text: attributed(name, e.statement), tone: v.display === 'confirmed' ? 'ok' : 'cond' }),
          )
      })
  })
  return out
}

/* ---------- Milestones: the default view of research progress ---------- */

export interface Milestone {
  id: 'understand' | 'discover' | 'contact' | 'evaluate'
  state: 'done' | 'active' | 'pending' | 'failed'
  title: string
  detail?: string
}

const STATE_OF = (st: string): Milestone['state'] => (st === 'done' ? 'done' : st === 'active' ? 'active' : st === 'failed' ? 'failed' : 'pending')

/** What has completed, what is happening now and what remains – straight from the timeline and the calls, no invented progress. */
export function buildMilestones(s: Scenario, timeline: TimelineStep, bvs: BusinessView[]): Milestone[] {
  const must = s.requirements.filter((r) => r.kind === 'must_have').length
  const { discover, contact, evaluate } = timeline.stages
  const count = (f: (b: BusinessView) => boolean) => bvs.filter(f).length
  const reached = count((b) => b.contact.reached)
  const triedOnly = count((b) => b.calls.length > 0 && !b.contact.reached)
  const notCalled = count((b) => b.calls.length === 0)
  const callParts = [reached && `Spoke with ${reached}`, triedOnly && `${triedOnly} not reached`, notCalled && `${notCalled} not contacted`].filter(Boolean) as string[]
  const sites = s.sources?.length
  return [
    { id: 'understand', state: 'done', title: 'Understood your request', detail: s.request.interpretation.map((i) => i.value).join(' · ') },
    {
      id: 'discover', state: STATE_OF(discover.status),
      title: discover.status === 'done' ? 'Found businesses' : discover.status === 'failed' ? 'Couldn’t start looking' : discover.status === 'active' ? 'Looking for businesses' : 'Look for businesses',
      detail: discover.status === 'done' ? [discover.detail.replace(' (as shown by Aurora)', '') + ' — as shown by Aurora', sites ? `${sites} websites checked` : ''].filter(Boolean).join(' · ') : discover.status === 'active' ? `Searching maps and websites near ${s.request.location}` : undefined,
    },
    {
      id: 'contact', state: STATE_OF(contact.status),
      title: contact.status === 'done' ? 'Contacted businesses' : contact.status === 'active' ? 'Calling businesses' : 'Call businesses',
      // Aurora's own count (as displayed) and the three businesses reviewed here are different scopes – both are shown, labelled, never merged.
      detail: contact.status === 'pending' ? undefined : [
        contact.status === 'done' ? `${contact.detail.replace(' (as shown by Aurora)', '')} — as shown by Aurora` : contact.detail,
        bvs.length ? `Of the ${bvs.length} reviewed here: ${callParts.join(' · ')}` : '',
      ].filter(Boolean).join('. '),
    },
    {
      id: 'evaluate', state: STATE_OF(evaluate.status),
      title: evaluate.status === 'done' ? `Compared answers with your ${must} must-haves` : evaluate.status === 'active' ? `Comparing answers with your ${must} must-haves` : `Compare answers with your ${must} must-haves`,
      detail: evaluate.status === 'done' ? `${bvs.length} business${bvs.length === 1 ? '' : 'es'} reviewed` : undefined,
    },
  ]
}

/** The useful answers that have arrived – not every event. Each keeps its “simulated” flag. */
export function usefulFindings(activity: Activity[], max = 5): Activity[] {
  return activity.filter((a) => a.kind === 'finding' && a.tone !== 'neutral').slice(-max)
}

/** Businesses that need a decision from the user, with the plain reason. Never lists a business just because it hasn't been called yet mid-search. */
export function needsAttention(bvs: BusinessView[], callingDone: boolean): { business: BusinessView; reason: string; kind: 'conflict' | 'alternative' | 'no_contact' | 'not_called' }[] {
  const out: { business: BusinessView; reason: string; kind: 'conflict' | 'alternative' | 'no_contact' | 'not_called' }[] = []
  bvs.forEach((b) => {
    const name = shortName(b.business.name)
    const conflicting = b.views.find((v) => v.display === 'conflicting' && v.requirement.kind === 'must_have')
    const alt = b.views.find((v) => v.alternative && v.display !== 'not_met')
    if (conflicting) out.push({ business: b, reason: `Answers conflict on ${lc(conflicting.requirement.short)}.`, kind: 'conflict' })
    else if (alt) out.push({ business: b, reason: `Offered ${alt.alternative} instead of ${lc(alt.requirement.short)}.`, kind: 'alternative' })
    else if (b.calls.length > 0 && !b.contact.reached) {
      const phrase = NO_CONTACT_PHRASE[b.contact.state] ?? 'Not reached'
      out.push({ business: b, reason: `${phrase}${b.contact.attempts > 1 ? ` · ${b.contact.attempts} attempts` : ''}. That isn’t a no.`, kind: 'no_contact' })
    } else if (callingDone && b.calls.length === 0) out.push({ business: b, reason: `${name} was found but not contacted.`, kind: 'not_called' })
  })
  return out
}

/* ---------- Cross-business synthesis ---------- */

export interface Coverage {
  requirement: Requirement
  cells: { business: string; display: RequirementView['display'] }[]
  summary: string
}

/** True when any current claim for this business comes from a scripted (simulated) follow-up. */
export const hasSimulated = (b: BusinessView) => b.views.some((v) => v.current.some((e) => e.origin === 'simulated'))

export function synthesis(bvs: BusinessView[], requirements: Requirement[]) {
  const order = { suitable: 0, potential: 1, not_suitable: 2, insufficient: 3 } as const
  const sentences = [...bvs]
    .sort((a, b) => order[a.suitability] - order[b.suitability] || (a.business.auroraRank ?? 99) - (b.business.auroraRank ?? 99))
    .map((b) => businessLine(b))
  const coverage: Coverage[] = requirements
    .filter((r) => r.kind === 'must_have')
    .map((r) => {
      const cells = bvs.map((b) => ({ business: b.business.name, display: b.views.find((v) => v.requirement.id === r.id)!.display }))
      // “Confirmed” counts only what a business said. Listings are reported separately and never added in.
      const ok = cells.filter((c) => c.display === 'confirmed').length
      const listed = cells.filter((c) => c.display === 'listed').length
      const summary = `${ok} of ${cells.length} confirmed${listed ? ` · ${listed} only listed` : ''}`
      return { requirement: r, cells, summary }
    })
  return { sentences, coverage }
}

/** How a status reads inside a sentence (“pickup today is still unknown”). */
const IN_SENTENCE: Partial<Record<DisplayStatus, string>> = {
  unanswered: 'still unknown',
  not_checked: 'not checked yet',
  no_answer: 'not reached',
  awaiting: 'awaiting confirmation',
  listed: 'only listed on a website or map, not confirmed',
  conditional: 'conditional',
  conflicting: 'conflicting',
  outdated: 'out of date',
  unattributed: 'without a visible source',
}
const phrase = (d: DisplayStatus) => IN_SENTENCE[d] ?? STATUS[d].label.toLowerCase()

function businessLine(b: BusinessView): string {
  const name = shortName(b.business.name)
  const musts = b.views.filter((v) => v.requirement.kind === 'must_have')
  const ok = musts.filter((v) => v.display === 'confirmed')
  const failed = musts.filter((v) => v.display === 'not_met')
  const open = musts.filter((v) => !ok.includes(v) && !failed.includes(v))
  const alt = musts.find((v) => v.alternative && v.display !== 'not_met')
  switch (b.suitability) {
    case 'suitable': {
      const listed = musts.filter((v) => v.display === 'listed')
      return listed.length ? `${name} confirmed ${listJoin(ok.map((v) => lc(v.requirement.short)))}; ${listJoin(listed.map((v) => lc(v.requirement.short)))} comes from a listing, not the business.` : `${name} confirmed all ${musts.length} must-haves.`
    }
    case 'not_suitable':
      return `${name} doesn’t meet “${failed[0].requirement.short}”.`
    case 'potential':
      if (alt) return `${name} reported ${alt.alternative} rather than your “${alt.requirement.short}”, which is ${phrase(alt.display)}${open.length > 1 ? `; ${open.length - 1} other must-have${open.length > 2 ? 's' : ''} still open` : ''}.`
    {
      // Group open items that share a status: “leak repair and today are both conditional”.
      const groups = new Map<string, string[]>()
      open.forEach((v) => groups.set(phrase(v.display), [...(groups.get(phrase(v.display)) ?? []), lc(v.requirement.short)]))
      const openText = listJoin([...groups].map(([p, items]) => `${listJoin(items)} ${items.length > 1 ? `are ${items.length === 2 ? 'both ' : ''}` : 'is '}${p}`))
      return ok.length ? `${name} confirmed ${listJoin(ok.map((v) => lc(v.requirement.short)))}; ${openText}.` : `For ${name}, ${openText}.`
    }
    case 'insufficient':
      if (b.contact.state === 'not_attempted') return `${name} was found but not contacted.`
      if (!b.contact.reached) return `${name}: no answer after ${b.contact.attempts} attempt${b.contact.attempts === 1 ? '' : 's'}. Nothing is known yet — that isn’t a no.`
      if (musts.every((v) => v.display === 'unattributed')) return `${name}’s positive claims have no visible source; its call established nothing.`
      return `${name} answered, but your must-haves weren’t established.`
  }
}

/** The one-sentence answer shown on a result card – the card's only description, so nothing else repeats it. */
export function verdictLine(b: BusinessView): string {
  const musts = b.views.filter((v) => v.requirement.kind === 'must_have')
  const ok = musts.filter((v) => v.display === 'confirmed')
  const failed = musts.filter((v) => v.display === 'not_met')
  const open = musts.filter((v) => !ok.includes(v) && !failed.includes(v))
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  const openText = (vs: RequirementView[]) => {
    const groups = new Map<string, string[]>()
    vs.forEach((v) => groups.set(phrase(v.display), [...(groups.get(phrase(v.display)) ?? []), lc(v.requirement.short)]))
    return listJoin([...groups].map(([p, items]) => `${listJoin(items)} ${items.length > 1 ? `are ${items.length === 2 ? 'both ' : ''}` : 'is '}${p}`))
  }
  switch (b.suitability) {
    case 'suitable':
      return musts.some((v) => v.display === 'listed') ? `Meets all ${musts.length} must-haves; one comes from a listing, not the business.` : `Confirmed all ${musts.length} must-haves.`
    case 'not_suitable':
      return `Doesn’t meet “${failed[0].requirement.short}”.`
    case 'potential': {
      const alt = open.find((v) => v.alternative)
      if (alt) {
        const rest = open.filter((v) => v !== alt)
        return `Offered ${alt.alternative} instead of ${lc(alt.requirement.short)} — ${phrase(alt.display)}.${rest.length ? ` ${cap(openText(rest))}.` : ''}`
      }
      return ok.length ? `Confirmed ${listJoin(ok.map((v) => lc(v.requirement.short)))}; ${openText(open)}.` : `${cap(openText(open))}.`
    }
    case 'insufficient':
      if (b.contact.state === 'not_attempted') return 'Found, but not contacted yet.'
      if (!b.contact.reached) return `No answer after ${b.contact.attempts} attempt${b.contact.attempts === 1 ? '' : 's'}. Nothing is known yet — that isn’t a no.`
      if (musts.every((v) => v.display === 'unattributed')) return 'Its positive claims have no visible source, and the call established nothing.'
      return 'Answered, but none of your must-haves were established.'
  }
}

/* ---------- Why this result? ---------- */

export function whyShown(b: BusinessView, suggested: boolean, all: BusinessView[] = []) {
  const musts = b.views.filter((v) => v.requirement.kind === 'must_have')
  const open = unresolved(b.views).filter((v) => v.requirement.kind === 'must_have')
  const failed = musts.filter((v) => v.display === 'not_met')
  const learned = b.views
    .filter((v) => v.primary && !['not_checked', 'not_applicable', 'unanswered'].includes(v.display))
    .slice(0, 4)
    .map((v) => ({
      requirement: v.requirement.short,
      display: v.display,
      statement: v.current.map((e) => e.statement).join(v.display === 'conflicting' ? ' — but — ' : ' '),
      basis: basisOf(v.primary!),
      caveat: v.primary!.caveat,
      simulated: v.primary!.origin === 'simulated',
    }))
  // Things the business was asked about (or that a call covered) but didn't answer – one line, not five.
  const gaps = b.views.filter((v) => v.display === 'unanswered').map((v) => lc(v.requirement.short))
  const sources = new Set(learned.map((l) => `${l.basis}|${l.caveat ?? ''}`))
  const sharedSource = sources.size === 1 && learned.length > 1 ? learned[0] : null
  const rank = b.business.auroraRank ? ` Aurora ranked it #${b.business.auroraRank}; that rank is Aurora’s own ordering, not a confirmation.` : ''
  let reason: string
  if (b.suitability === 'suitable') reason = `${musts.some((v) => v.display === 'listed') ? 'Every must-have is met; one rests on a listing rather than a call.' : 'Every must-have was confirmed on a call.'}${suggested ? ' It’s shown first because the evidence singles it out.' : ''}`
  else if (b.suitability === 'not_suitable') reason = `It’s shown so you can see why it was ruled out: it doesn’t meet “${failed[0].requirement.short}”.`
  else if (b.suitability === 'potential') {
    // Say exactly why it was singled out – never imply a comparison that didn't happen.
    const otherPossible = all.filter((o) => o.business.id !== b.business.id && o.suitability === 'potential').length
    const why = !suggested
      ? ''
      : otherPossible === 0
        ? ' It’s suggested because it’s the only possible option so far — the others weren’t reached, contacted or established nothing.'
        : ' It’s suggested because it has fewer open must-haves than the other possible options.'
    reason = `It’s relevant and Aurora reached it, but ${open.length} must-have${open.length === 1 ? ' is' : 's are'} still open, so it isn’t a confirmed match yet.${why}`
  }
  else if (b.contact.state === 'not_attempted') reason = 'Aurora found it but hasn’t called it, so nothing about your request is checked yet.'
  else if (!b.contact.reached) reason = 'Aurora found it, but no call was answered, so nothing is verified. A missed call isn’t a no.'
  else reason = 'Aurora spoke to it, but the call didn’t establish your must-haves.'
  return { learned, gaps, sharedSource, reason: reason + rank }
}

/* ---------- Understanding a typed instruction (deterministic, prototype-only) ---------- */

export const SYNONYMS: Record<string, string[]> = {
  variant: ['256', 'gb', 'stock', 'model', 'variant', 'storage'],
  price: ['price', 'cost', 'final price', 'how much'],
  pickup: ['pickup', 'pick up', 'pick-up', 'collect'],
  colour: ['colour', 'color', 'colours', 'colors'],
  payment: ['payment', 'pay', 'upi', 'card', 'cash'],
  service: ['cleaning', 'service'],
  date: ['slot', 'appointment', 'date', 'time', '3 nov'],
  budget: ['price', 'cost', 'total', 'fee'],
  repair: ['repair', 'fix', 'joint', 'leak', 'pvc'],
  sameday: ['today', 'same day', 'same-day'],
  cost: ['price', 'cost', 'charge'],
  mode: ['drop', 'drop-off', 'on-site', 'onsite', 'visit', 'home'],
  area: ['location', 'where', 'address', 'area'],
}

export type Command =
  | { kind: 'verify'; ids: string[] }
  | { kind: 'explain' }
  | { kind: 'compare'; withId: string | null }
  | { kind: 'budget'; value: number }
  | { kind: 'unknown' }

export function interpretCommand(text: string, b: BusinessView, others: BusinessView[]): Command {
  const t = ` ${text.toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/[^\w₹\s-]/g, ' ')} `
  if (/\b(why|reason|explain|included|shown)\b/.test(t)) return { kind: 'explain' }
  if (/\b(compare|versus|vs)\b/.test(t)) {
    const other = others.find((o) => o.business.id !== b.business.id && o.business.name.toLowerCase().split(/[\s–/]+/).some((w) => w.length >= 3 && t.includes(` ${w}`)))
    return { kind: 'compare', withId: other?.business.id ?? null }
  }
  const money = t.match(/(?:₹\s*|budget\D{0,12})(\d{4,})/)
  if (money && /budget|max|up to|upto|₹/.test(t)) return { kind: 'budget', value: Number(money[1]) }
  const ids = b.views
    .filter((v) => (SYNONYMS[v.requirement.id] ?? [v.requirement.short.toLowerCase()]).some((k) => t.includes(k)))
    .map((v) => v.requirement.id)
  if (ids.length) return { kind: 'verify', ids }
  if (/\b(retry|call again|try again|ask again|verify|check)\b/.test(t)) return { kind: 'verify', ids: unresolved(b.views).filter((v) => v.requirement.kind === 'must_have').map((v) => v.requirement.id) }
  return { kind: 'unknown' }
}
