// One source of truth for the whole prototype: a reducer + context.
// Results, business details, comparison, chat and live progress all read the same state,
// so a follow-up updates every screen at once.

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import type { CallRecord, Evidence, FollowUpMode, FollowUpScript, OutcomeState, ProcessState, Requirement, RequirementKind, Scenario, StageId, TimelineStep } from '../types'
import { DEFAULT_SCENARIO, getScenario, SCENARIOS } from '../data/scenarios'
import { buildBusinessView, evaluateRequirement, searchOutcome, unresolved, type BusinessView, type DisplayStatus, type EvalContext, type Suitability } from '../logic/evaluate'
import { inr } from '../logic/format'
import { buildActivity, type Activity } from '../logic/agent'
import { chatReply, interpretChat, type ChatContext, type ChatMessage } from '../logic/chat'

/* ---------- Routes ---------- */

export type Route =
  | { name: 'start' }
  | { name: 'chat' }
  | { name: 'progress' }
  | { name: 'results' }
  | { name: 'business'; id: string }
  | { name: 'compare' }
  | { name: 'controls' }
  | { name: 'followup'; id: string }

/* ---------- Follow-up ---------- */

export type FollowUpPhase = 'choose' | 'review' | 'queued' | 'calling' | 'interpreting' | 'done'

export interface FollowUpChange {
  requirementId: string
  before: DisplayStatus
  beforeStatement?: string
  after: DisplayStatus
  /** What this call said about the requirement (absent = not answered on this call). */
  statements: string[]
  condition?: string
  /** The new answer contradicts what was known before, or the call itself gave contradictory answers. */
  conflict: boolean
  simulated: boolean
}

export interface FollowUpResult {
  outcome: CallRecord['outcome']
  callId?: string
  changes: FollowUpChange[]
  cancelled?: boolean
  suitabilityBefore?: Suitability
  suitabilityAfter?: Suitability
  /** Requirements still open after the call (asked or not). */
  stillOpen?: { requirementId: string; display: DisplayStatus }[]
}

export interface FollowUpDraft {
  businessId: string
  selected: string[]
  phase: FollowUpPhase
  result?: FollowUpResult
}

/* ---------- State ---------- */

export interface AppState {
  scenarioId: string
  step: number
  cancelledAtStep: number | null
  evidence: Evidence[] // scenario evidence + follow-up evidence (follow-ups are appended, never overwrite)
  calls: CallRecord[]
  budget: number | null // user-edited budget, null = as requested
  /** User corrections to how important a requirement is (must-have ↔ preference ↔ good to know). */
  kinds?: Record<string, RequirementKind>
  hoursAhead: number // demo control: move the clock forward to show stale evidence
  followUp: FollowUpDraft | null
  compare: string[]
  stack: Route[]
  /** Screens popped by browser Back, kept so browser Forward can return to them. */
  future?: Route[]
  /** Increases on scenario load / reset so browser history can be re-aligned with the new stack. */
  session?: number
  /** Instructions typed in the chat composer and Aurora's replies. */
  chat?: ChatMessage[]
}

const isRunning = (p: ProcessState) => p === 'discovering' || p === 'contacting' || p === 'evaluating'

export function initialState(scenarioId: string): AppState {
  const s = getScenario(scenarioId)
  const startProcess = s.timeline[s.startStep].process
  const root: Route[] = s.intro ? [{ name: 'start' }] : startProcess === 'completed' ? [{ name: 'chat' }, { name: 'results' }] : [{ name: 'chat' }]
  return {
    scenarioId: s.id,
    step: s.startStep,
    cancelledAtStep: null,
    evidence: s.evidence,
    calls: s.calls,
    budget: null,
    hoursAhead: 0,
    followUp: null,
    compare: [],
    stack: root,
  }
}

export type Action =
  | { type: 'LOAD_SCENARIO'; id: string }
  | { type: 'BEGIN' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'STOP_SEARCH' }
  | { type: 'RESUME' }
  | { type: 'PUSH'; route: Route }
  | { type: 'POP' }
  | { type: 'GO'; depth: number }
  | { type: 'POP_TO'; route: Route }
  | { type: 'TOGGLE_COMPARE'; id: string }
  | { type: 'SET_COMPARE'; ids: string[] }
  | { type: 'SET_BUDGET'; value: number | null }
  | { type: 'SET_KIND'; id: string; kind: RequirementKind | null }
  | { type: 'SET_HOURS_AHEAD'; value: number }
  | { type: 'CHAT_SAY'; text: string }
  | { type: 'FU_START'; businessId: string; preselect: string[] }
  | { type: 'FU_TOGGLE'; requirementId: string }
  | { type: 'FU_REVIEW' }
  | { type: 'FU_EDIT' }
  | { type: 'FU_RETRY' }
  | { type: 'FU_APPROVE' }
  | { type: 'FU_ADVANCE' }
  | { type: 'FU_CANCEL' }
  | { type: 'FU_CLOSE' }

/* ---------- Derived helpers (pure, shared by reducer and UI) ---------- */

export function currentStep(s: Scenario, state: Pick<AppState, 'step' | 'cancelledAtStep'>): TimelineStep {
  const base = s.timeline[Math.min(state.step, s.timeline.length - 1)]
  if (state.cancelledAtStep == null) return base
  const stages = Object.fromEntries(
    (Object.keys(base.stages) as StageId[]).map((k) => {
      const st = base.stages[k]
      return [k, st.status === 'active' ? { status: 'stopped', detail: 'Stopped by you' } : st]
    }),
  ) as TimelineStep['stages']
  return { process: 'cancelled', stages, note: 'You stopped this search. Answers already received are saved.' }
}

export function effectiveRequirements(s: Scenario, budget: number | null, kinds?: Record<string, RequirementKind>): Requirement[] {
  return s.requirements.map((r) => {
    let out = r
    if (budget != null && r.budget != null) out = { ...out, budget, label: out.label.replace(/₹[\d,]+/, inr(budget)) }
    if (kinds?.[r.id]) out = { ...out, kind: kinds[r.id] }
    return out
  })
}

export function evalContext(s: Scenario, hoursAhead: number): EvalContext {
  return { now: new Date(new Date(s.now).getTime() + hoursAhead * 36e5).toISOString() }
}

/** Scenario evidence and calls appear only once the live timeline has reached them. */
function visible<T extends { businessId: string }>(items: T[], s: Scenario, step: number, isFollowUp: (t: T) => boolean) {
  return items.filter((i) => isFollowUp(i) || (s.businesses.find((b) => b.id === i.businessId)?.revealStep ?? 0) <= step)
}

export function resolveScript(s: Scenario, businessId: string, mode: FollowUpMode): FollowUpScript {
  if (mode === 'no_answer') return { outcome: 'no_answer', summary: ['No one answered'], answers: {} }
  if (mode === 'failed') return { outcome: 'technical_failure', summary: ['The call couldn’t be connected'], answers: {} }
  const forBiz = s.scripts[businessId]
  return forBiz?.[mode] ?? forBiz?.answered ?? { outcome: 'no_answer', summary: ['No one answered'], answers: {} }
}

/* ---------- Reducer ---------- */

export function reducer(state: AppState, a: Action): AppState {
  const s = getScenario(state.scenarioId)
  switch (a.type) {
    case 'LOAD_SCENARIO':
      return { ...initialState(a.id), session: (state.session ?? 0) + 1 }
    // From the start screen into the conversation: the request is sent and Aurora starts searching.
    case 'BEGIN':
      return { ...state, stack: [{ name: 'chat' }], future: [] }
    case 'RESET':
      return { ...initialState(state.scenarioId), session: (state.session ?? 0) + 1 }
    case 'GO': {
      // Browser Back/Forward land on a history entry that knows its depth; move the app stack to match.
      const len = state.stack.length
      const future = state.future ?? []
      if (a.depth < len) return { ...state, stack: state.stack.slice(0, Math.max(1, a.depth)), future: [...state.stack.slice(Math.max(1, a.depth)), ...future] }
      if (a.depth > len && future.length) {
        const n = Math.min(a.depth - len, future.length)
        return { ...state, stack: [...state.stack, ...future.slice(0, n)], future: future.slice(n) }
      }
      return state
    }
    case 'TICK': {
      if (state.cancelledAtStep != null) return state
      const cur = s.timeline[state.step]
      if (!isRunning(cur.process) || state.step >= s.timeline.length - 1) return state
      return { ...state, step: state.step + 1 }
    }
    case 'STOP_SEARCH': {
      const cur = s.timeline[state.step]
      if (!isRunning(cur.process)) return state
      return { ...state, cancelledAtStep: state.step }
    }
    case 'RESUME': {
      if (state.cancelledAtStep != null) return { ...state, cancelledAtStep: null }
      const cur = s.timeline[state.step]
      if ((cur.process === 'interrupted' || cur.process === 'failed') && state.step < s.timeline.length - 1)
        return { ...state, step: state.step + 1 }
      return state
    }
    case 'PUSH':
      return { ...state, stack: [...state.stack, a.route], future: [] }
    case 'POP':
      return state.stack.length > 1 ? { ...state, stack: state.stack.slice(0, -1) } : state
    case 'POP_TO': {
      // Go back to an earlier screen if it's in the stack; otherwise swap the current screen for it.
      const same = (r: Route) => r.name === a.route.name && ('id' in r ? r.id : '') === ('id' in a.route ? a.route.id : '')
      const idx = state.stack.map(same).lastIndexOf(true)
      return { ...state, stack: idx >= 0 ? state.stack.slice(0, idx + 1) : [...state.stack.slice(0, -1), a.route] }
    }
    case 'TOGGLE_COMPARE':
      return {
        ...state,
        compare: state.compare.includes(a.id) ? state.compare.filter((x) => x !== a.id) : [...state.compare, a.id],
      }
    case 'SET_COMPARE':
      return { ...state, compare: a.ids }
    case 'SET_BUDGET':
      return { ...state, budget: a.value }
    case 'CHAT_SAY': {
      // Interpret against what the user sees now; apply any change; reply from the updated state. Never places a call.
      const ctx = (st: AppState): ChatContext => {
        const d = derive(st)
        return { requirements: d.requirements, businesses: d.businesses, evaluated: d.evaluated, outcome: d.outcome, process: d.process }
      }
      const before = ctx(state)
      const cmd = interpretChat(a.text, before)
      let next = state
      if (cmd.kind === 'budget') next = { ...next, budget: cmd.value }
      if (cmd.kind === 'importance') {
        const original = getScenario(state.scenarioId).requirements
        const kinds = { ...(state.kinds ?? {}) }
        cmd.ids.forEach((id) => {
          if (original.find((r) => r.id === id)?.kind === cmd.to) delete kinds[id]
          else kinds[id] = cmd.to
        })
        next = { ...next, kinds }
      }
      const chat = state.chat ?? []
      const reply = chatReply(cmd, before, ctx(next))
      return {
        ...next,
        chat: [...chat, { id: `m${chat.length}`, role: 'user', text: a.text }, { id: `m${chat.length + 1}`, role: 'aurora', ...reply }],
      }
    }
    case 'SET_KIND': {
      const kinds = { ...(state.kinds ?? {}) }
      if (a.kind === null) delete kinds[a.id]
      else kinds[a.id] = a.kind
      return { ...state, kinds }
    }
    case 'SET_HOURS_AHEAD':
      return { ...state, hoursAhead: a.value }

    case 'FU_START':
      return { ...state, followUp: { businessId: a.businessId, selected: a.preselect, phase: 'choose' } }
    case 'FU_TOGGLE': {
      if (!state.followUp) return state
      const sel = state.followUp.selected
      return {
        ...state,
        followUp: { ...state.followUp, selected: sel.includes(a.requirementId) ? sel.filter((x) => x !== a.requirementId) : [...sel, a.requirementId] },
      }
    }
    case 'FU_REVIEW':
      return state.followUp && state.followUp.selected.length ? { ...state, followUp: { ...state.followUp, phase: 'review' } } : state
    case 'FU_EDIT':
      return state.followUp ? { ...state, followUp: { ...state.followUp, phase: 'choose', result: undefined } } : state
    case 'FU_RETRY':
      // Retry goes straight to review: same questions, but the user still approves before any call.
      return state.followUp ? { ...state, followUp: { ...state.followUp, phase: 'review', result: undefined } } : state
    case 'FU_APPROVE':
      // The only way a follow-up call starts: an explicit approval on the review step.
      return state.followUp?.phase === 'review' ? { ...state, followUp: { ...state.followUp, phase: 'queued', result: undefined } } : state
    case 'FU_ADVANCE': {
      const fu = state.followUp
      if (!fu) return state
      if (fu.phase === 'queued') return { ...state, followUp: { ...fu, phase: 'calling' } }
      if (fu.phase === 'interpreting') return { ...state, followUp: { ...fu, phase: 'done' } }
      if (fu.phase !== 'calling') return state
      return applyFollowUp(state, s, fu)
    }
    case 'FU_CANCEL': {
      const fu = state.followUp
      if (!fu) return state
      if (fu.phase === 'calling') {
        const call: CallRecord = {
          id: `fu-${fu.businessId}-${state.calls.length}`, businessId: fu.businessId, kind: 'follow_up', outcome: 'cancelled',
          at: evalContext(s, state.hoursAhead).now, summary: ['Cancelled by you before the business answered'], asked: fu.selected, origin: 'simulated',
        }
        return { ...state, calls: [...state.calls, call], followUp: { ...fu, phase: 'done', result: { outcome: 'cancelled', callId: call.id, changes: [], cancelled: true } } }
      }
      if (fu.phase === 'queued') return { ...state, followUp: { ...fu, phase: 'done', result: { outcome: 'cancelled', changes: [], cancelled: true } } }
      return { ...state, followUp: null }
    }
    case 'FU_CLOSE':
      return { ...state, followUp: null }
  }
}

function applyFollowUp(state: AppState, s: Scenario, fu: FollowUpDraft): AppState {
  const ctx = evalContext(s, state.hoursAhead)
  const reqs = effectiveRequirements(s, state.budget, state.kinds)
  const script = resolveScript(s, fu.businessId, s.followUpMode)
  const callId = `fu-${fu.businessId}-${state.calls.length}`
  // Each simulated follow-up is stamped a few minutes after the previous one, so history stays in order.
  const priorFollowUps = state.calls.filter((c) => c.kind === 'follow_up').length
  const at = new Date(new Date(ctx.now).getTime() + priorFollowUps * 4 * 60e3).toISOString()
  const call: CallRecord = {
    id: callId, businessId: fu.businessId, kind: 'follow_up', outcome: script.outcome, at,
    duration: script.duration, summary: script.summary, transcript: script.transcript, asked: fu.selected, origin: 'simulated',
    transcriptNote: undefined,
  }
  const answered = script.outcome === 'completed_with_information' || script.outcome === 'answered'
  const bizEvidence = state.evidence.filter((e) => e.businessId === fu.businessId)
  const round = Math.max(0, ...bizEvidence.map((e) => e.round)) + 1

  // Only requirements the user chose AND the business actually addressed get new evidence.
  // A missed / failed call adds nothing. An unanswered question never replaces something already known.
  const reqsById = new Map(reqs.map((r) => [r.id, r]))
  const newEvidence: Evidence[] = []
  if (answered) {
    fu.selected.forEach((rid) => {
      const raw = script.answers[rid]
      if (!raw) return
      const known = evaluateRequirement(reqsById.get(rid)!, bizEvidence, ctx)
      const list = (Array.isArray(raw) ? raw : [raw]).filter((ans) => !(ans.status === 'insufficient_information' && known.fit !== 'unknown'))
      list.forEach((ans, i) =>
        newEvidence.push({
          id: `${callId}-${rid}-${i}`, businessId: fu.businessId, requirementId: rid, round, source: 'prototype_simulation',
          obtainedAt: at, callId, origin: 'simulated', ...ans,
        }),
      )
    })
  }
  const evidence = [...state.evidence, ...newEvidence]
  const bizAfter = evidence.filter((e) => e.businessId === fu.businessId)
  const definite = (f: string) => f !== 'unknown'
  const changes: FollowUpChange[] = fu.selected.map((rid) => {
    const req = reqsById.get(rid)!
    const before = evaluateRequirement(req, bizEvidence, ctx)
    const after = evaluateRequirement(req, bizAfter, ctx)
    const fromThisCall = after.current.filter((e) => e.callId === callId)
    return {
      requirementId: rid,
      before: before.display,
      beforeStatement: before.primary?.statement,
      after: after.display,
      statements: fromThisCall.map((e) => e.statement),
      condition: fromThisCall.find((e) => e.condition)?.condition,
      conflict: after.display === 'conflicting' || (definite(before.fit) && definite(after.fit) && before.fit !== after.fit && fromThisCall.length > 0),
      simulated: fromThisCall.some((e) => e.origin === 'simulated'),
    }
  })
  const biz = s.businesses.find((b) => b.id === fu.businessId)!
  const calls = [...state.calls, call]
  const beforeView = buildBusinessView(biz, reqs, bizEvidence, state.calls, ctx)
  const afterView = buildBusinessView(biz, reqs, bizAfter, calls, ctx)
  const stillOpen = unresolved(afterView.views)
    .filter((v) => v.requirement.kind === 'must_have' || fu.selected.includes(v.requirement.id))
    .map((v) => ({ requirementId: v.requirement.id, display: v.display }))
  return {
    ...state,
    calls,
    evidence,
    followUp: {
      ...fu,
      phase: answered ? 'interpreting' : 'done',
      result: { outcome: script.outcome, callId, changes, suitabilityBefore: beforeView.suitability, suitabilityAfter: afterView.suitability, stillOpen },
    },
  }
}

/* ---------- Persistence (per-browser convenience; reset restores the demo) ---------- */

const KEY = 'aurora-decision-prototype-v5'
function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (SCENARIOS.some((s) => s.id === parsed.scenarioId) && Array.isArray(parsed.stack) && parsed.stack.length) return parsed
    }
  } catch {
    /* storage unavailable – fall back to the default demo */
  }
  return initialState(DEFAULT_SCENARIO)
}

/* ---------- Context ---------- */

export interface Derived {
  scenario: Scenario
  timeline: TimelineStep
  process: ProcessState
  requirements: Requirement[]
  ctx: EvalContext
  businesses: BusinessView[]
  outcome: OutcomeState
  evaluated: boolean
  running: boolean
  discovered: boolean
  route: Route
  /** Research activity narrative, derived from the same state as everything else. */
  activity: Activity[]
}

export function derive(state: AppState): Derived {
  const scenario = getScenario(state.scenarioId)
  const timeline = currentStep(scenario, state)
  const requirements = effectiveRequirements(scenario, state.budget, state.kinds)
  const ctx = evalContext(scenario, state.hoursAhead)
  const evidence = visible(state.evidence, scenario, state.step, (e) => e.round > 0)
  const calls = visible(state.calls, scenario, state.step, (c) => c.kind === 'follow_up')
  const discovered = timeline.stages.discover.status === 'done'
  const businesses = discovered
    ? scenario.businesses.map((b) => buildBusinessView(b, requirements, evidence, calls, ctx))
    : []
  const evaluated = timeline.process === 'completed'
  const outcome = searchOutcome(timeline.process, evaluated, businesses)
  return {
    scenario, timeline, process: timeline.process, requirements, ctx, businesses, outcome, evaluated,
    running: isRunning(timeline.process), discovered, route: state.stack[state.stack.length - 1],
    activity: buildActivity(scenario, timeline, businesses),
  }
}

const Ctx = createContext<{ state: AppState; dispatch: (a: Action) => void; d: Derived } | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const d = useMemo(() => derive(state), [state])

  // Live search: advance the deterministic timeline while it is running.
  useEffect(() => {
    if (!d.running || state.stack[0]?.name === 'start') return
    const t = window.setTimeout(() => dispatch({ type: 'TICK' }), 2800)
    return () => window.clearTimeout(t)
  }, [d.running, state.step, state.stack[0]?.name])

  // Simulated follow-up call progression (never a real call).
  const phase = state.followUp?.phase
  useEffect(() => {
    if (phase !== 'queued' && phase !== 'calling' && phase !== 'interpreting') return
    const ms = phase === 'queued' ? 1400 : phase === 'calling' ? 2600 : 1600
    const t = window.setTimeout(() => dispatch({ type: 'FU_ADVANCE' }), ms)
    return () => window.clearTimeout(t)
  }, [phase])

  // Browser back mirrors the in-app stack.
  // Browser history mirrors the app stack: every entry stores its depth, so Back and Forward both work.
  const realigning = useRef(false)
  const stackRef = useRef(state.stack.length)
  stackRef.current = state.stack.length
  useEffect(() => {
    const rebuild = () => {
      window.history.replaceState({ depth: 1 }, '')
      for (let i = 2; i <= stackRef.current; i++) window.history.pushState({ depth: i }, '')
    }
    const onPop = (e: PopStateEvent) => {
      if (realigning.current) {
        realigning.current = false
        rebuild()
        return
      }
      dispatch({ type: 'GO', depth: (e.state as { depth?: number } | null)?.depth ?? 1 })
    }
    window.addEventListener('popstate', onPop)
    rebuild()
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // After a scenario switch or reset, rewind history to the first entry and rebuild it for the new stack.
  useEffect(() => {
    if (!state.session) return
    const depth = (window.history.state as { depth?: number } | null)?.depth ?? 1
    if (depth > 1) {
      realigning.current = true
      window.history.go(-(depth - 1))
    } else {
      window.history.replaceState({ depth: 1 }, '')
      for (let i = 2; i <= stackRef.current; i++) window.history.pushState({ depth: i }, '')
    }
  }, [state.session])

  return <Ctx.Provider value={{ state, dispatch, d }}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

/** Navigation helpers that keep the browser history in step with the app stack. */
export function useNav() {
  const { state, dispatch } = useApp()
  const depth = state.stack.length
  const historyDepth = () => (window.history.state as { depth?: number } | null)?.depth
  return {
    push: (route: Route) => {
      window.history.pushState({ depth: depth + 1 }, '')
      dispatch({ type: 'PUSH', route })
    },
    // Use browser history when it matches the app; otherwise pop in-app, so Back can never leave the prototype.
    back: () => (depth > 1 && historyDepth() === depth ? window.history.back() : dispatch({ type: 'POP' })),
    /** Jump back to an earlier screen (or swap the current one for it), keeping browser history aligned. */
    popTo: (route: Route) => {
      const same = (r: Route) => r.name === route.name && ('id' in r ? r.id : '') === ('id' in route ? route.id : '')
      const idx = state.stack.map(same).lastIndexOf(true)
      if (idx >= 0 && historyDepth() === depth && idx + 1 < depth) window.history.go(idx + 1 - depth)
      else {
        dispatch({ type: 'POP_TO', route })
        window.history.replaceState({ depth: idx >= 0 ? idx + 1 : depth }, '')
      }
    },
  }
}
