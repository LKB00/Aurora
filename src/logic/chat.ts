/* The chat composer: understands a small set of typed instructions about the whole search.
 * Deterministic keyword matching only – a prototype stand-in for real language understanding, and the UI says so.
 * Nothing here places a call: anything that would call a business ends in the normal review-and-approve step. */
import type { Requirement, RequirementKind } from '../types'
import type { BusinessView } from './evaluate'
import { unresolved } from './evaluate'
import { listJoin, SYNONYMS, whyShown } from './agent'
import { outcomeCopy, suggestedBusiness } from './copy'
import { inr, lc, shortName } from './format'
import type { OutcomeState, ProcessState } from '../types'

export type ChatAction =
  | { kind: 'review'; businessId: string; ids: string[]; label: string }
  | { kind: 'compare'; ids: string[]; label: string }
  | { kind: 'results'; label: string }
  | { kind: 'business'; id: string; label: string }

export interface ChatMessage {
  id: string
  role: 'user' | 'aurora'
  text: string
  actions?: ChatAction[]
}

export type ChatCommand =
  | { kind: 'importance'; ids: string[]; to: RequirementKind }
  | { kind: 'budget'; value: number }
  | { kind: 'verify'; businessId: string; ids: string[] }
  | { kind: 'pick_business'; ids: string[] }
  | { kind: 'explain'; businessId: string }
  | { kind: 'compare'; ids: string[] }
  | { kind: 'results' }
  | { kind: 'new_search' }
  | { kind: 'not_ready' }
  | { kind: 'unknown' }

export interface ChatContext {
  requirements: Requirement[]
  businesses: BusinessView[]
  evaluated: boolean
  outcome: OutcomeState
  process: ProcessState
}

/** Words in business names that don't identify one business (“Hardware” is in two names). */
const GENERIC = new Set(['hardware', 'sanitary', 'dental', 'clinic', 'enterprises', 'international', 'road', 'electronics', 'furnishings', 'dentist', 'the', 'and', 'near', 'store'])

const norm = (text: string) => ` ${text.toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/[^\w₹\s-]/g, ' ').replace(/\s+/g, ' ')} `

function namedBusinesses(t: string, bvs: BusinessView[]) {
  return bvs.filter((b) =>
    b.business.name
      .toLowerCase()
      .split(/[\s–/&]+/)
      .some((w) => w.length >= 3 && !GENERIC.has(w) && t.includes(` ${w}`)),
  )
}

function namedRequirements(t: string, reqs: Requirement[]) {
  return reqs.filter((r) => (SYNONYMS[r.id] ?? [r.short.toLowerCase()]).some((k) => t.includes(k))).map((r) => r.id)
}

export function interpretChat(text: string, ctx: ChatContext): ChatCommand {
  const t = norm(text)
  const reqIds = namedRequirements(t, ctx.requirements)

  // A different place, product or date is a new search – never faked.
  if (/^ (find|search|look for)\b/.test(t) || /\b(new search|search for|look for|instead of|another|different) /.test(t) || /\bchange (the )?(location|area|place|city|date|day|product)\b/.test(t))
    return { kind: 'new_search' }

  // Importance: “make pickup good to know”, “self-pay doesn’t matter”, “price is a must”.
  if (reqIds.length) {
    let to: RequirementKind | null = null
    if (/(doesn t matter|don t care|not important|not needed|not required|not a must|optional|nice to have|good to know|ignore)/.test(t)) to = 'informational'
    else if (/\b(prefer|preference|would like|nice if)\b/.test(t)) to = 'preference'
    else if (/\b(must[- ]?have|a must|is a must|essential|required|make .* must|important)\b/.test(t)) to = 'must_have'
    if (to) return { kind: 'importance', ids: reqIds, to }
  }

  const money = t.match(/(?:₹\s*|budget\D{0,12})(\d{4,})/)
  if (money && /budget|max|up to|upto|₹/.test(t)) return { kind: 'budget', value: Number(money[1]) }

  const named = namedBusinesses(t, ctx.businesses)
  const suggested = suggestedBusiness(ctx.businesses)
  const needsResults = (c: ChatCommand): ChatCommand => (ctx.evaluated ? c : { kind: 'not_ready' })

  if (/\b(compare|versus|vs|side by side)\b/.test(t)) {
    const ids = named.map((b) => b.business.id)
    const fill = [suggested, ...ctx.businesses].filter((b): b is BusinessView => !!b && !ids.includes(b.business.id)).map((b) => b.business.id)
    return needsResults({ kind: 'compare', ids: [...ids, ...fill].slice(0, 2) })
  }
  if (/\b(why|reason|explain)\b/.test(t)) {
    const b = named[0] ?? suggested
    return b ? needsResults({ kind: 'explain', businessId: b.business.id }) : { kind: 'unknown' }
  }
  if (/\b(results|what did you find|summary|status|how is it going|progress|show me)\b/.test(t)) return { kind: 'results' }

  const askVerb = /\b(check|ask|call|verify|confirm|retry|try again|follow up|only)\b/.test(t)
  if (named.length && (askVerb || reqIds.length)) {
    const b = named[0]
    const own = reqIds.filter((id) => b.views.some((v) => v.requirement.id === id))
    const ids = own.length ? own : unresolved(b.views).filter((v) => v.requirement.kind === 'must_have').map((v) => v.requirement.id)
    return needsResults({ kind: 'verify', businessId: b.business.id, ids })
  }
  if (askVerb && reqIds.length) return needsResults({ kind: 'pick_business', ids: reqIds })
  return { kind: 'unknown' }
}

const KIND_WORD: Record<RequirementKind, string> = { must_have: 'a must-have', preference: 'a preference', informational: 'good to know' }

/** Aurora's reply. `before` is the context the instruction was given in; `after` reflects any change it made. */
export function chatReply(cmd: ChatCommand, before: ChatContext, after: ChatContext): Omit<ChatMessage, 'id' | 'role'> {
  const req = (id: string) => before.requirements.find((r) => r.id === id)!
  const biz = (id: string) => before.businesses.find((b) => b.business.id === id)!
  const results: ChatAction[] = after.evaluated ? [{ kind: 'results', label: 'See results' }] : []
  switch (cmd.kind) {
    case 'importance': {
      const changed = cmd.ids.filter((id) => req(id).kind !== cmd.to)
      if (!changed.length) return { text: `${listJoin(cmd.ids.map((id) => req(id).short))} ${cmd.ids.length > 1 ? 'are' : 'is'} already ${KIND_WORD[cmd.to]}.` }
      const what = listJoin(changed.map((id) => lc(req(id).short)))
      return {
        text: `Done — ${what} ${changed.length > 1 ? 'are' : 'is'} now ${KIND_WORD[cmd.to]}. I re-checked the answers I already have; nobody was called.`,
        actions: results,
      }
    }
    case 'budget': {
      const hasPriceLimit = before.requirements.some((r) => r.budget != null)
      return {
        text: hasPriceLimit
          ? `Budget set to ${inr(cmd.value)}. I re-checked the prices I already have; nobody was called.`
          : `Noted ${inr(cmd.value)}, but this request has no price limit to check it against, so no answers changed. Nobody was called.`,
        actions: results,
      }
    }
    case 'verify': {
      const b = biz(cmd.businessId)
      const name = shortName(b.business.name)
      return {
        text: `I’ll ask ${name} only about ${listJoin(cmd.ids.map((id) => lc(req(id).short)))}. Nothing happens until you approve the call.`,
        actions: [{ kind: 'review', businessId: b.business.id, ids: cmd.ids, label: 'Review the call' }],
      }
    }
    case 'pick_business': {
      const options = before.businesses.filter((b) => b.suitability !== 'not_suitable').slice(0, 3)
      return {
        text: `Which business should I ask about ${listJoin(cmd.ids.map((id) => lc(req(id).short)))}?`,
        actions: options.map((b) => ({ kind: 'review', businessId: b.business.id, ids: cmd.ids.filter((id) => b.views.some((v) => v.requirement.id === id)), label: shortName(b.business.name) })),
      }
    }
    case 'explain': {
      const b = biz(cmd.businessId)
      const suggested = suggestedBusiness(before.businesses)
      return {
        text: whyShown(b, suggested?.business.id === b.business.id, before.businesses).reason,
        actions: [{ kind: 'business', id: b.business.id, label: `Open ${shortName(b.business.name)}` }],
      }
    }
    case 'compare': {
      const [a, b] = cmd.ids.map(biz)
      if (!a || !b) return { text: 'I need two businesses to compare, and only one has been reviewed so far.' }
      return {
        text: `I’ll put ${shortName(a.business.name)} and ${shortName(b.business.name)} side by side against your request.`,
        actions: [{ kind: 'compare', ids: cmd.ids, label: 'Open comparison' }],
      }
    }
    case 'results': {
      if (!after.evaluated) return { text: 'Calls are still under way. I’ll show results as soon as the answers are checked.' }
      const c = outcomeCopy(after.outcome, after.process, after.businesses)
      return { text: `${c.title}. ${c.body}`, actions: results }
    }
    case 'new_search':
      return {
        text: 'That would be a different search — a new place, product or date — and a new search can’t be started from here. Your current results and everything Aurora learned stay as they are. Meanwhile I can change what matters, change your budget, ask a business a follow-up question, compare two businesses, or explain a result.',
        actions: results,
      }
    case 'not_ready':
      return { text: 'I can do that once the calls finish and the answers are checked — they’re still coming in.' }
    case 'unknown':
      return {
        text: 'I didn’t catch that. Try changing what matters (“self-pay doesn’t matter”), your budget, or asking a business something (“check the price at Happy Client”).',
      }
  }
}
