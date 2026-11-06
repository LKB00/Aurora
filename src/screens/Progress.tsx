// What Aurora did. Reads the same state as the chat, so the two can never disagree.
// Order is by what the person needs: the conclusion, then how each of their must-haves came out, then store by store,
// and only then the process (numbers, steps, the full activity log).
import { ActivityTrace, ApproveIcon, Badge, Button, Callout, GlobeIcon, MicIcon, NeedsReviewIcon, SectionLabel, ThoughtIcon, XIcon } from '@tattva/ui'
import { useState, type ReactNode } from 'react'
import { buildMilestones, synthesis, verdictLine, type Activity } from '../logic/agent'
import { contactText } from '../logic/contact'
import { outcomeCopy } from '../logic/copy'
import { shortName } from '../logic/format'
import { useApp } from '../state/store'
import { Screen } from '../ui/Screen'
import { DemoButton } from '../ui/Demo'
import { Recovery } from '../ui/Recovery'
import { CARD_LABEL, StatusGlyph, SuitabilityBadge, verdictTile } from '../ui/vocab'

const traceActor = (a: Activity) => (a.kind === 'evaluation' ? ('rule' as const) : ('ai' as const))
const num = (s?: string) => { const m = s?.match(/\d[\d,]*/); return m ? Number(m[0].replace(/,/g, '')) : null }

const card = 'rounded-card border border-line bg-surface'

// Long lists show their first few, then "Show all N". Keeps the sheet short whether Aurora looked at 3 stores or 50.
function useLimited<T>(items: T[], limit = 5) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, limit)
  const more = items.length > limit ? (
    <Button size="lg" variant="ghost" className="w-full" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${items.length}`}</Button>
  ) : null
  return { shown, more }
}

function Section({ label, children, aside }: { label: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel className="px-0!">{label}</SectionLabel>
        {aside}
      </div>
      {children}
    </section>
  )
}

// Four stages as a row. Only shown while the search is unfinished or stopped: once it is done, a row of ticks says nothing.
const STEP_LABEL: Record<string, [string, string]> = {
  understand: ['Understand', 'Understood'],
  discover: ['Find', 'Found'],
  contact: ['Call', 'Called'],
  evaluate: ['Compare', 'Compared'],
}

// Each stage wears its own picture once done: reading, finding, calling, checking.
const STAGE_ICON: Record<string, ReactNode> = {
  understand: <ThoughtIcon width={16} height={16} />,
  discover: <GlobeIcon width={16} height={16} />,
  contact: <MicIcon width={16} height={16} />,
  evaluate: <ApproveIcon width={16} height={16} />,
}

function Stepper({ steps }: { steps: { id: string; state: 'done' | 'active' | 'todo' | 'failed' }[] }) {
  return (
    <ol aria-label="Task progress" className="m-0 grid list-none grid-cols-4 p-0">
      {steps.map((m, i) => {
        const done = m.state === 'done'
        const label = STEP_LABEL[m.id]?.[done ? 1 : 0] ?? m.id
        return (
          <li key={m.id} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && <span aria-hidden className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${steps[i - 1].state === 'done' ? 'bg-success' : 'bg-line'}`} />}
            <span
              aria-hidden
              className={`relative z-10 grid size-8 place-items-center rounded-full border-2 ${
                done ? 'border-success bg-success text-on-success'
                : m.state === 'failed' ? 'border-danger bg-danger text-on-danger'
                : m.state === 'active' ? 'border-accent bg-surface text-accent'
                : 'border-line bg-surface text-fg-muted'
              }`}
            >
              {done ? STAGE_ICON[m.id] : m.state === 'failed' ? <XIcon width={14} height={14} /> : m.state === 'active' ? <span className="size-2.5 animate-pulse rounded-full bg-accent" /> : <span className="size-2 rounded-full bg-line" />}
            </span>
            <span className={`text-small leading-4 ${m.state === 'todo' ? 'text-fg-muted' : 'font-medium text-fg'}`}>{label}</span>
            <span className="sr-only">{m.state}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function Progress() {
  const { d, dispatch } = useApp()
  const milestones = buildMilestones(d.scenario, d.timeline, d.businesses).map((m) => ({
    id: m.id, title: m.title, detail: m.detail, state: (m.state === 'pending' ? 'todo' : m.state) as 'done' | 'active' | 'todo' | 'failed',
  }))
  const trace = d.activity.map((a) => ({
    id: a.id,
    actor: traceActor(a),
    title: a.text,
    detail: a.detail ? <span>{a.detail}</span> : undefined,
    status: a.live ? ('running' as const) : ('done' as const),
  }))
  const ranked = [...d.businesses].filter((b) => b.business.auroraRank).sort((a, b) => (a.business.auroraRank ?? 99) - (b.business.auroraRank ?? 99))
  const st = d.timeline.stages
  const found = st.discover.status === 'done' || st.discover.status === 'active' ? num(st.discover.detail) : null
  const reached = st.contact.status === 'done' || st.contact.status === 'active' ? num(st.contact.detail) : null
  const reviewed = d.businesses.length
  const finished = d.evaluated && !d.running
  const verdict = outcomeCopy(d.outcome, d.process, d.businesses)
  const vi = verdictTile(d.outcome)
  const { coverage } = synthesis(d.businesses, d.requirements)
  const stores = useLimited(d.businesses)
  const listed = useLimited(d.scenario.listed)
  const rank = useLimited(ranked)
  const scope = [found != null && `Aurora found ${found} businesses`, reached != null && `reached ${reached}`].filter(Boolean).join(' and ')

  return (
    <Screen title="What Aurora did" subtitle={d.scenario.request.title} actions={<DemoButton />}>
      <div className="flex flex-col gap-8 px-4 py-4">
        {d.timeline.note && (
          <Callout tone={d.process === 'failed' ? 'danger' : d.process === 'interrupted' ? 'warning' : 'info'} title={d.process === 'failed' ? 'This search couldn’t run' : d.process === 'interrupted' ? 'The search paused' : 'Search stopped'}>
            {d.timeline.note}
            <div className="mt-2 flex gap-2">
              {(d.process === 'interrupted' || d.process === 'cancelled') && <Button size="lg" onClick={() => dispatch({ type: 'RESUME' })}>Resume search</Button>}
            </div>
          </Callout>
        )}
        {d.process === 'failed' && <Recovery />}

        {/* 1. The conclusion, in the person's terms. */}
        {finished ? (
          <section aria-label="Conclusion" className={`${card} flex items-start gap-3 p-4`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${vi.tile}`} aria-hidden>{vi.icon}</span>
            <div className="min-w-0">
              <h2 className="m-0 text-subhead leading-6 font-semibold text-fg">{verdict.title}</h2>
              <p className="m-0 mt-1 text-body leading-6 text-fg-muted">{verdict.body}</p>
              {scope && <p className="m-0 mt-2 text-note leading-5 text-fg-muted">{scope}. {reviewed} {reviewed === 1 ? 'is' : 'are'} reviewed here against your must-haves.</p>}
            </div>
          </section>
        ) : (
          <section aria-label="Stages" className="flex flex-col gap-5">
            <Stepper steps={milestones} />
            {d.running && <Button size="lg" variant="secondary" onClick={() => dispatch({ type: 'STOP_SEARCH' })}>Stop search</Button>}
          </section>
        )}

        {/* 2. Their own must-haves: did anyone confirm each one? */}
        {finished && coverage.length > 0 && (
          <Section label="Your must-haves">
            <ul className={`${card} m-0 flex list-none flex-col p-0`}>
              {coverage.map((c) => (
                <li key={c.requirement.id} className="flex flex-col gap-2.5 border-b border-line p-4 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-body leading-5 font-medium text-fg">{c.requirement.short}</span>
                    <span className="shrink-0 text-note text-fg-muted">{c.summary}</span>
                  </div>
                  {c.cells.length <= 6 ? (
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                      {c.cells.map((cell) => (
                        <li key={cell.business} aria-label={`${shortName(cell.business)}: ${CARD_LABEL[cell.display]}`} className="inline-flex items-center gap-1.5 rounded-full bg-sunken py-1 pr-2.5 pl-2 text-small leading-4 text-fg ring-1 ring-line">
                          <StatusGlyph status={cell.display} />
                          {shortName(cell.business)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                      {(['confirmed', 'other'] as const).map((k) => {
                        const n = c.cells.filter((x) => (k === 'confirmed' ? x.display === 'confirmed' : x.display !== 'confirmed')).length
                        return n ? <span key={k} className={k === 'confirmed' ? 'bg-success' : 'bg-line-strong'} style={{ flexGrow: n }} /> : null
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-fg-muted">
              <span className="inline-flex items-center gap-1"><ApproveIcon width={14} height={14} className="text-success" /> confirmed</span>
              <span className="inline-flex items-center gap-1"><XIcon width={14} height={14} className="text-danger" /> not available</span>
              <span className="inline-flex items-center gap-1"><NeedsReviewIcon width={14} height={14} className="text-unsure-fg" /> partly known</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-full border-2 border-line-strong" /> not known</span>
            </p>
          </Section>
        )}

        {/* 3. Store by store: what each one said, and what it means. One card per store, nothing repeated elsewhere. */}
        {finished && reviewed > 0 && (
          <Section label="Store by store">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {stores.shown.map((b) => (
                <li key={b.business.id} className={`${card} flex flex-col gap-2 p-4`}>
                  <h3 className="m-0 font-sans! text-body leading-6 font-semibold! text-fg [overflow-wrap:anywhere]">{b.business.name}</h3>
                  <div><SuitabilityBadge value={b.suitability} /></div>
                  <p className="m-0 text-body leading-6 text-fg">{verdictLine(b)}</p>
                  <p className="m-0 text-note leading-5 text-fg-muted">{contactText(b.contact)}</p>
                </li>
              ))}
            </ul>
            {stores.more}
          </Section>
        )}

        {/* 4. The process, for anyone who wants to check the work. */}
        <Section label="How Aurora got here">
          {(found != null || reached != null || reviewed > 0) && (
            <dl className={`${card} m-0 grid grid-cols-3 divide-x divide-line`}>
              {[
                { n: found, l: 'found' },
                { n: reached, l: 'reached' },
                { n: reviewed || null, l: 'reviewed here' },
              ].map((x) => (
                <div key={x.l} className="flex flex-col items-center gap-0.5 px-2 py-3">
                  <dd className="m-0 text-[24px] leading-7 font-semibold tracking-tight text-fg tabular-nums">{x.n ?? '–'}</dd>
                  <dt className="text-note text-fg-muted">{x.l}</dt>
                </div>
              ))}
            </dl>
          )}
          {(found != null || reached != null) && <p className="m-0 -mt-1 text-small text-fg-muted">Found and reached are Aurora’s own counts. Reviewed is how many were checked against your must-haves.</p>}
          <ActivityTrace steps={trace} summary={`${trace.length} steps${d.running ? ' so far' : ''}`} streaming={d.running} defaultOpen={!d.evaluated} actorLabels={{ ai: 'Aurora', rule: 'Rule' }} />
        </Section>

        {d.scenario.countsNote && <Callout tone="info" title="About these counts">{d.scenario.countsNote}</Callout>}
        {d.scenario.listedNote && d.scenario.listed.length > 0 && (
          <Section label="Also in Aurora’s list">
            <p className="m-0 text-note text-fg-muted">{d.scenario.listedNote}</p>
            <ul className={`${card} m-0 flex list-none flex-col p-0`}>
              {listed.shown.map((l) => (
                <li key={l.name} className="flex items-center justify-between gap-3 border-b border-line p-3 text-body last:border-b-0"><span className="min-w-0 truncate">{l.name}</span><Badge className="shrink-0 whitespace-nowrap">{l.shownStatus}</Badge></li>
              ))}
            </ul>
            {listed.more}
          </Section>
        )}

        {ranked.length > 0 && d.evaluated && (
          <Section label="Aurora’s original ranking">
            <ol className={`${card} m-0 flex list-none flex-col gap-4 p-4`}>
              {rank.shown.map((b) => (
                <li key={b.business.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-body">
                    <span className="min-w-0 truncate"><span className="text-fg-muted">#{b.business.auroraRank}</span> {b.business.name}</span>
                    <span className="shrink-0 font-medium tabular-nums">{b.business.auroraMatch}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden><div className="h-full rounded-full bg-fg-muted/50" style={{ width: `${b.business.auroraMatch ?? 0}%` }} /></div>
                </li>
              ))}
            </ol>
            {rank.more}
            <p className="m-0 text-note text-fg-muted">Match is what Aurora showed. How it’s worked out isn’t known, so results are grouped by what was actually confirmed instead.</p>
          </Section>
        )}
      </div>
    </Screen>
  )
}
