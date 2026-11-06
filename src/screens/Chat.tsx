// The conversation: the request, what Aurora is doing, the outcome, and a way to ask about the search.
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AIDisclosure, AISuggestIcon, ApproveIcon, Button, ChevronIcon, FactList, Message, MessageList, MicOffIcon, NeedsReviewIcon, PlanIcon, SectionLabel, StatusTicker, StepTimeline, ThoughtIcon, WorkingEdge, XIcon } from '@tattva/ui'
import { Notice } from '../ui/Notice'
import { buildMilestones, needsAttention, verdictLine } from '../logic/agent'
import { outcomeCopy, suggestedBusiness } from '../logic/copy'
import { inr, lc, shortName } from '../logic/format'
import type { ChatAction } from '../logic/chat'
import type { BusinessView } from '../logic/evaluate'
import { useApp, useNav } from '../state/store'
import { DemoButton } from '../ui/Demo'
import { Screen } from '../ui/Screen'
import { Eq, Narration, Spark } from '../ui/LiveBits'
import { Reveal } from '../ui/Reveal'
import { verdictTile } from '../ui/vocab'
import { ChatInput } from '../ui/ChatInput'
import { Recovery } from '../ui/Recovery'
import { RequirementsSheetButton } from '../ui/Requirements'
import { useStartFollowUp } from '../ui/useStartFollowUp'

function useSuggestions() {
  const { d } = useApp()
  const suggested = d.evaluated ? suggestedBusiness(d.businesses) : null
  const lastMust = [...d.requirements].reverse().find((r) => r.kind === 'must_have')
  const budget = d.requirements.find((r) => r.budget != null)?.budget
  const opens = suggested ? suggested.views.filter((v) => v.requirement.kind === 'must_have' && !v.satisfied).slice(0, 2) : []
  const checks = opens.map((v) => ({ label: `Check ${lc(v.requirement.short)}`, text: `Check ${lc(v.requirement.short)} at ${shortName(suggested!.business.name)}` }))
  return [
    ...checks,
    ...(checks.length < 2 && lastMust ? [{ label: `Make ${lc(lastMust.short)} good to know`, text: `Make ${lc(lastMust.short)} good to know` }] : []),
    ...(checks.length < 2 && budget ? [(() => { const t = `Set my budget to ${inr(budget + Math.max(500, Math.round((budget * 0.05) / 500) * 500))}`; return { label: t, text: t } })()] : []),
  ].slice(0, 2)
}

// "Suggested next steps": short follow-ups in the user's own voice, listed under the answer until the user types their own. Tapping one sends it as if typed.
function NextSteps({ items, onPick }: { items: { label: string; text: string }[]; onPick: (t: string) => void }) {
  return (
    <section aria-label="Suggested next steps" className="flex flex-col gap-1">
      <SectionLabel>Suggested next steps</SectionLabel>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((t) => (
          <li key={t.label}>
            <button type="button" onClick={() => onPick(t.text)} className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-control px-1 py-2.5 text-left text-body leading-6 text-fg active:bg-pressed">
              <span className="flex h-6 shrink-0 items-center text-fg-muted"><AISuggestIcon width={16} height={16} /></span>
              <span className="min-w-0">{t.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ChatActionButton({ a }: { a: ChatAction }) {
  const { dispatch } = useApp()
  const nav = useNav()
  const start = useStartFollowUp()
  const run = () => {
    if (a.kind === 'results') nav.push({ name: 'results' })
    if (a.kind === 'business') nav.push({ name: 'business', id: a.id })
    if (a.kind === 'review') start(a.businessId, a.ids)
    if (a.kind === 'compare') {
      dispatch({ type: 'SET_COMPARE', ids: a.ids })
      nav.push({ name: 'compare' })
    }
  }
  return <Button size="lg" variant="secondary" onClick={run}>{a.label}</Button>
}

const STEP_TEXT: Record<string, string> = { understand: 'Reading your request', discover: 'Finding businesses', contact: 'Calling businesses', evaluate: 'Comparing answers' }

// The live search. Aurora narrates what it is doing, then shows what has come back that matters to you: who has it, who offered
// something different, who didn't pick up. Never a list of every store, so it reads the same for 3 stores or 50.
function LiveSearch() {
  const { d, dispatch } = useApp()
  const nav = useNav()
  const ms = buildMilestones(d.scenario, d.timeline, d.businesses)
  const active = ms.find((m) => m.state === 'active') ?? ms.find((m) => m.state === 'pending')
  const stepId = active?.id ?? 'discover'
  const stepNo = Math.max(1, ms.findIndex((m) => m.id === stepId) + 1)
  const st = d.timeline.stages
  const foundN = st.discover.status === 'done' ? Number(st.discover.detail.match(/\d+/)?.[0]) || 0 : 0
  const musts = d.requirements.filter((r) => r.kind === 'must_have').map((r) => lc(r.short))
  const where = d.scenario.request.location

  // What has come back, in terms that matter to the person: who has it, who doesn't, who didn't pick up.
  const called = d.businesses.filter((b) => b.calls.length > 0)
  const att = needsAttention(d.businesses, false)
  const offeredOther = att.filter((a) => a.kind === 'alternative' || a.kind === 'conflict').length
  const noPickup = att.filter((a) => a.kind === 'no_contact').length
  const sofar = [offeredOther && `${offeredOther} offered something different`, noPickup && `${noPickup} didn’t pick up`].filter(Boolean).join(', ')
  const narration =
    stepId === 'discover' ? `Searching maps and websites near ${where} for businesses that may offer the ${d.scenario.request.title.replace(/^Apple /, '')}…`
    : stepId === 'contact' ? `${foundN ? `I found ${foundN} businesses. ` : ''}I’m calling them to check ${musts.length ? musts.join(', ') : 'stock and price'}.${sofar ? ` So far, ${sofar}.` : ''}`
    : stepId === 'evaluate' ? `The calls are in. I’m checking what each store told me against your ${musts.length} must-haves.`
    : 'Reading your request…'

  // The answers worth reading, oldest to newest. Only a few are shown however many stores there are; the rest live behind "See what Aurora did".
  const news = d.activity.filter((a) => !a.live && ((a.kind === 'finding' && a.tone !== 'neutral') || a.kind === 'call_attempt'))
  const shown = news.slice(-3)
  const nowCalling = d.businesses.filter((b) => b.calls.length === 0 && st.contact.status === 'active').slice(0, 1).map((b) => shortName(b.business.name))
  const callingNow = stepId === 'contact' && nowCalling.length > 0 && d.activity.some((a) => a.kind === 'maps' && a.text.includes(nowCalling[0]))
  return (
    <WorkingEdge active label="Aurora is searching">
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Spark />
          <div className="min-w-0 flex-1">
            <StatusTicker current={STEP_TEXT[stepId]} steps={Object.values(STEP_TEXT)} label="Aurora status" className="text-body leading-5 font-medium" />
          </div>
          <span className="shrink-0 text-note text-fg-muted tabular-nums">{stepNo}/4</span>
        </div>

        <Narration key={narration} text={narration} />

        {(shown.length > 0 || callingNow) && (
          <section aria-label="What I’ve found so far" className="flex flex-col gap-2">
            <SectionLabel className="px-0!">Found so far{news.length > shown.length ? ` · ${news.length - shown.length} earlier` : ''}</SectionLabel>
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
              {shown.map((a) => (
                <li key={a.id} className="flex animate-rise items-start gap-3 rounded-xl bg-sunken p-3">
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center ${a.kind === 'finding' && a.tone === 'ok' ? 'text-success' : 'text-fg-muted'}`} aria-hidden>
                    {a.kind === 'finding' && a.tone === 'ok' ? <ApproveIcon width={20} height={20} /> : a.kind === 'finding' ? <NeedsReviewIcon width={20} height={20} /> : <MicOffIcon width={20} height={20} />}
                  </span>
                  <span className="min-w-0 text-note leading-5 text-fg">{a.text}</span>
                </li>
              ))}
              {callingNow && (
                <li className="flex items-center gap-3 px-3 py-1 text-note text-fg-muted"><Eq />Calling {nowCalling[0]}…</li>
              )}
            </ul>
          </section>
        )}

        {foundN > 0 && stepId === 'contact' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-note text-fg-muted">
              <span><span className="font-medium text-fg tabular-nums">{called.length}</span> of {foundN} businesses called</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden><div className="h-full rounded-full bg-accent transition-[width] duration-(--dur-spring) ease-(--ease-spring)" style={{ width: `${Math.max(2, (called.length / foundN) * 100)}%` }} /></div>
          </div>
        )}

        <div className="-mx-1 -mb-1 flex flex-wrap gap-1 border-t border-line pt-2">
          <Button size="lg" variant="ghost" onClick={() => nav.push({ name: 'progress' })}>See what Aurora did</Button>
          <Button size="lg" variant="ghost" onClick={() => dispatch({ type: 'STOP_SEARCH' })}>Stop search</Button>
        </div>
      </div>
    </WorkingEdge>
  )
}

// Not running: finished, stopped, paused or failed. A plain list says where it got to.
function Progress() {
  const { d, dispatch } = useApp()
  const nav = useNav()
  if (d.running) return <LiveSearch />
  const steps = buildMilestones(d.scenario, d.timeline, d.businesses).map((m) => ({
    id: m.id,
    title: m.title,
    detail: m.detail,
    state: (m.state === 'pending' ? 'todo' : m.state) as 'done' | 'active' | 'todo' | 'failed',
  }))
  return (
    <div className="flex flex-col gap-3">
      {d.timeline.note && (
        <Notice tone={d.process === 'failed' ? 'danger' : d.process === 'interrupted' ? 'warning' : 'info'} title={d.process === 'failed' ? 'This search couldn’t run' : d.process === 'interrupted' ? 'The search paused' : 'Search stopped'}>
          {d.timeline.note}
        </Notice>
      )}
      <StepTimeline steps={steps} />
      <div className="flex flex-wrap gap-2">
        <Button size="lg" variant="secondary" onClick={() => nav.push({ name: 'progress' })}>See what Aurora did</Button>
        {(d.process === 'interrupted' || d.process === 'cancelled') && <Button size="lg" onClick={() => dispatch({ type: 'RESUME' })}>Resume search</Button>}
      </div>
    </div>
  )
}

// The best match's supporting line: when you can have it.
function matchFact(b: BusinessView, _best?: boolean) {
  const pickup = b.views.some((v) => v.requirement.id === 'pickup' && v.satisfied)
  return pickup ? 'In stock · pickup today' : verdictLine(b)
}

function Answer() {
  const { d } = useApp()
  const nav = useNav()
  const copy = outcomeCopy(d.outcome, d.process, d.businesses)
  const attention = needsAttention(d.businesses, true)
  const finding = attention.find((a) => a.business.suitability === 'potential') ?? attention[0]
  const n = d.businesses.length
  const vi = verdictTile(d.outcome)
  // When businesses are confirmed, lead with the best one and keep the rest quiet.
  const matches = d.businesses.filter((b) => b.suitability === 'suitable')
  const priceOf = (b: BusinessView) => b.views.find((v) => v.requirement.id === 'price')?.primary?.priceValue ?? null
  const ranked = [...matches].sort((x, y) => (priceOf(x) ?? Infinity) - (priceOf(y) ?? Infinity))
  const best = ranked[0]
  const rest = ranked.slice(1, 3)
  const musts = d.requirements.filter((r) => r.kind === 'must_have').map((r) => lc(r.short))
  const open = (b: BusinessView) => nav.push({ name: 'business', id: b.business.id })
  const body = best ? `${matches.length === 1 ? 'It' : 'Each'} confirmed ${musts.slice(0, -1).join(', ')}${musts.length > 1 ? ' and ' : ''}${musts.at(-1)}.` : copy.body
  // One card: the conclusion, the one thing that needs a decision, and the action that opens what the conclusion is about.
  // The button used to float under the card, belonging to nothing.
  return (
    <section aria-label="Answer" className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-start gap-3 p-4">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${vi.tile}`} aria-hidden>{vi.icon}</span>
        <div className="min-w-0">
          <h2 className="m-0 text-subhead leading-6 font-semibold text-fg">{copy.title}</h2>
          <p className="m-0 mt-1 text-body leading-6 text-fg-muted">{body}</p>
        </div>
      </div>
      {best && (
        <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-line">
          <button type="button" onClick={() => open(best)} className="flex w-full cursor-pointer items-center gap-3 bg-lime-soft px-4 py-3 text-left active:opacity-80">
            <span className="min-w-0 flex-1">
              <span className="block text-note leading-4 font-medium text-fg-muted">{rest.length ? 'Best price' : 'Confirmed'}</span>
              <span className="mt-0.5 block text-body leading-5 font-semibold text-fg">{shortName(best.business.name)}</span>
              <span className="block text-note leading-4 text-fg-muted">{matchFact(best, true)}</span>
            </span>
            {priceOf(best) != null && <span className="text-subhead leading-6 font-semibold text-fg">{inr(priceOf(best)!)}</span>}
            <ChevronIcon width={16} height={16} className="shrink-0 text-fg-muted" />
          </button>
          {rest.map((b) => (
            <button key={b.business.id} type="button" onClick={() => open(b)} className="flex w-full cursor-pointer items-center gap-3 border-t border-line px-4 py-3 text-left active:bg-pressed">
              <span className="min-w-0 flex-1 truncate text-body leading-5 text-fg">{shortName(b.business.name)}</span>
              <span className="text-body leading-5 text-fg-muted">{priceOf(b) != null ? inr(priceOf(b)!) : ''}</span>
              <ChevronIcon width={16} height={16} className="shrink-0 text-fg-muted" />
            </button>
          ))}
        </div>
      )}
      {finding && (
        <div className="mx-4 mb-4 rounded-xl bg-sunken p-3">
          <p className="m-0 text-note leading-4 font-medium text-fg-muted">Needs your decision</p>
          <p className="m-0 mt-1 text-body leading-5 text-fg"><strong className="font-semibold">{shortName(finding.business.business.name)}:</strong> {finding.reason}</p>
        </div>
      )}
      {d.scenario.recovery && <div className="px-4 pb-4 pl-[68px]"><Recovery inside /></div>}
      {n > 0 && (
        <div className="border-t border-line p-3">
          <Button size="lg" variant={best ? 'secondary' : 'primary'} className="w-full" onClick={() => nav.push({ name: 'results' })}>{n === 1 ? 'See the business' : `See all ${n} businesses`}</Button>
        </div>
      )}
    </section>
  )
}

// One row of the grouped list under the answer: an icon, a name, a one-line summary and a chevron.
function InfoRow({ icon, title, summary, open, onClick, expanded }: { icon: ReactNode; title: string; summary: string; open?: boolean; onClick: () => void; expanded?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className="flex min-h-14 w-full cursor-pointer items-start! gap-3 px-4 py-3 text-left active:bg-pressed">
      <span className="flex h-6 shrink-0 items-center text-fg-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body leading-6 font-medium text-fg">{title}</span>
        <span className="mt-0.5 block text-note leading-5 text-fg-muted">{summary}</span>
      </span>
      <ChevronIcon width={18} height={18} className={`mt-[3px] shrink-0 text-fg-subtle transition-transform duration-(--dur-spring) ease-(--ease-spring) ${open ? 'rotate-90' : ''}`} />
    </button>
  )
}

// The two things Aurora keeps quiet but available: what it understood from the request (opens in place, with the way to change it) and how it got to
// this answer (opens the full progress screen).
function ProcessGroup({ showProcess }: { showProcess: boolean }) {
  const { state, d } = useApp()
  const nav = useNav()
  const [open, setOpen] = useState(false)
  const facts = d.scenario.request.interpretation.map((i) => ({
    label: i.label,
    value: i.label === 'Max budget' && state.budget != null ? `${inr(state.budget)} (you changed this)` : i.value + (i.note ? ` — ${i.note}` : ''),
  }))
  const summary = d.scenario.request.interpretation.map((i) => (i.label === 'Max budget' && state.budget != null ? inr(state.budget) : i.value)).join(' · ')
  const { discover, contact } = d.timeline.stages
  const num = (t: string) => t.replace(' (as shown by Aurora)', '').match(/\d+/)?.[0]
  const scope = [num(discover.detail) && `${num(discover.detail)} found`, num(contact.detail) && `${num(contact.detail)} reached`, `${d.businesses.length} reviewed here`].filter(Boolean).join(' · ')
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <InfoRow icon={<ThoughtIcon width={20} height={20} />} title="How Aurora understood you" summary={summary} open={open} expanded={open} onClick={() => setOpen((o) => !o)} />
      <Reveal open={open}>
        <div className="flex flex-col gap-3 px-4 pb-4 pl-12">
          <FactList facts={facts} layout="stacked" />
          <div><RequirementsSheetButton label="Change a requirement" /></div>
        </div>
      </Reveal>
      {showProcess && (
        <div className="border-t border-line">
          <InfoRow icon={<PlanIcon width={20} height={20} />} title="How Aurora got here" summary={scope} onClick={() => nav.push({ name: 'progress' })} />
        </div>
      )}
    </div>
  )
}

// The user's own message: attached images lead, and long wording folds to four lines with a way to read the rest.
export function UserRequest({ text, note, attachments, full }: { text: string; note?: string; attachments?: { src: string; alt: string }[]; full?: boolean }) {
  const [open, setOpen] = useState(!!full)
  const [clamped, setClamped] = useState(false)
  const [viewing, setViewing] = useState<{ src: string; alt: string } | null>(null)
  const ref = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => { const el = ref.current; if (el && !open) setClamped(el.scrollHeight > el.clientHeight + 1) }, [text, open])
  return (
    <div className="flex flex-col gap-1.5">
      {attachments && attachments.length > 0 && (
        <div className={`-mx-2 -mt-0.5 grid gap-1.5 ${attachments.length > 1 ? 'grid-cols-2' : ''}`}>
          {attachments.map((a) => (
            <button key={a.src} type="button" onClick={() => setViewing(a)} aria-label={`Enlarge: ${a.alt}`} className="block cursor-zoom-in overflow-hidden rounded-xl border-0 bg-transparent p-0 active:opacity-80">
              <img src={a.src} alt={a.alt} className="h-36 w-full object-cover object-center" />
            </button>
          ))}
        </div>
      )}
      <p ref={ref} className={`m-0 ${open ? '' : 'line-clamp-4'}`}>{text}</p>
      {!full && (clamped || open) && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="relative h-auto! min-h-0! w-fit cursor-pointer before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] cursor-pointer border-0 bg-transparent p-0 text-note leading-4 font-medium text-fg-muted underline underline-offset-2">{open ? 'Show less' : 'Show more'}</button>
      )}
      {note && <span className="block text-note text-fg-muted">{note}</span>}
      {viewing && <ImageViewer image={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

// Full-screen look at an attached image: it opens from a fade and a small scale on the spring curve; tap anywhere, the close button or Escape to leave.
function ImageViewer({ image, onClose }: { image: { src: string; alt: string }; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', k)
    return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', k) }
  })
  const close = () => { setShown(false); window.setTimeout(onClose, 220) }
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={image.alt} onClick={close}
      className={`fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 transition-opacity duration-(--dur-base) ease-(--ease-out) ${shown ? 'opacity-100' : 'opacity-0'}`}>
      <img src={image.src} alt={image.alt}
        className={`max-h-full max-w-full rounded-xl object-contain transition-[transform,opacity] duration-(--dur-spring) ease-(--ease-spring) ${shown ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} />
      <button type="button" aria-label="Close" onClick={(e) => { e.stopPropagation(); close() }}
        className="absolute right-4 top-[calc(var(--safe-top,0px)+8px)] grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-white backdrop-blur-md active:bg-white/25">
        <XIcon width={20} height={20} />
      </button>
    </div>,
    document.body,
  )
}

export function Chat() {
  const { state, d, dispatch } = useApp()
  const end = useRef<HTMLDivElement>(null)
  const count = state.chat?.length ?? 0
  useEffect(() => { if (count) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [count])
  const done = d.evaluated || d.scenario.recovery != null
  const req = d.scenario.request
  const suggestions = useSuggestions()
  const showSuggestions = d.evaluated && suggestions.length > 0 && !(state.chat ?? []).length
  return (
    <Screen
      title={req.title}
      subtitle={req.location}
      onBack={() => dispatch({ type: 'HOME' })}
      backLabel="Home"
      actions={<DemoButton />}
      footer={
        <div className="flex flex-col gap-2">
          <ChatInput placeholder="Ask about this search" onSend={(t) => dispatch({ type: 'CHAT_SAY', text: t })} />
          <AIDisclosure />
        </div>
      }
    >
      <div className="px-4 pb-6">
        <MessageList>
          <Message role="user">
            <UserRequest text={req.text} attachments={req.attachments} />
          </Message>
          <Message role="assistant">
            <div className="flex flex-col gap-4">
              {!done && <p>{req.acknowledgement}</p>}
              {d.evaluated || (d.scenario.recovery && !d.running) ? <Answer /> : <Progress />}
              <ProcessGroup showProcess={done} />
              {showSuggestions && <NextSteps items={suggestions} onPick={(t) => dispatch({ type: 'CHAT_SAY', text: t })} />}
            </div>
          </Message>
          {(state.chat ?? []).map((m) => (
            <Message key={m.id} role={m.role === 'user' ? 'user' : 'assistant'}>
              <p>{m.text}</p>
              {m.actions && <div className="mt-2 flex flex-wrap gap-2">{m.actions.map((a, i) => <ChatActionButton key={i} a={a} />)}</div>}
            </Message>
          ))}
        </MessageList>
        <div ref={end} />
      </div>
    </Screen>
  )
}
