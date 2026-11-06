// A follow-up call, in four honest steps: choose what to ask, approve it, watch it happen, see exactly what changed.
// The call is simulated. Nothing starts until the person approves.
import { ApprovalPrompt, Badge, Button, Checkbox, ApproveIcon, FactList, Receipt, SectionLabel, StatusTicker, WorkingEdge } from '@tattva/ui'
import { Notice } from '../ui/Notice'
import { contactText } from '../logic/contact'
import { unresolved } from '../logic/evaluate'
import { shortName } from '../logic/format'
import { useApp, useNav } from '../state/store'
import { Screen } from '../ui/Screen'
import { Eq, Narration, Spark } from '../ui/LiveBits'
import { SUITABILITY_COPY, StatusBadge, statusLabel } from '../ui/vocab'

const OUTCOME: Record<string, string> = {
  no_answer: 'No one answered', busy: 'The line was busy', declined: 'The call was declined', technical_failure: 'The call couldn’t be connected', cancelled: 'You cancelled the call',
  completed_insufficient_information: 'They answered, but nothing useful came out of it', answered: 'They answered', completed_with_information: 'They answered',
}

export function FollowUp({ id }: { id: string }) {
  const { state, d, dispatch } = useApp()
  const nav = useNav()
  const fu = state.followUp
  const b = d.businesses.find((x) => x.business.id === id)
  const leave = () => { dispatch({ type: 'FU_CLOSE' }); nav.back() }
  if (!fu || fu.businessId !== id || !b) {
    return <Screen title="Follow-up"><div className="p-4"><Notice tone="info" title="No follow-up in progress"><Button size="lg" onClick={nav.back}>Go back</Button></Notice></div></Screen>
  }
  const name = shortName(b.business.name)
  const open = unresolved(b.views)
  const asked = b.views.filter((v) => fu.selected.includes(v.requirement.id))
  const lastCall = [...b.calls].sort((x, y) => (y.at ?? '').localeCompare(x.at ?? ''))[0]

  /* 1 — choose */
  if (fu.phase === 'choose') {
    return (
      <Screen
        title={`Check with ${name}`}
        subtitle="Choose what Aurora should ask"
        footer={
          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full" disabled={fu.selected.length === 0} onClick={() => dispatch({ type: 'FU_REVIEW' })}>Review the call</Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={leave}>Cancel</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-8 px-4 py-4">
          <p className="text-body text-fg-muted">Aurora will ask only about what is still open. Untick anything you don’t need. Nothing happens until you approve.</p>
          <section aria-label="Questions" className="flex flex-col gap-1">
            <SectionLabel className="px-0!">What to ask</SectionLabel>
            {open.map((v) => (
              <Checkbox
                key={v.requirement.id}
                checked={fu.selected.includes(v.requirement.id)}
                onChange={() => dispatch({ type: 'FU_TOGGLE', requirementId: v.requirement.id })}
                label={v.requirement.question}
                description={`${v.requirement.label} · ${statusLabel(v.display)}`}
              />
            ))}
          </section>
          <section aria-label="What Aurora carries over" className="flex flex-col gap-2">
            <SectionLabel className="px-0!">What Aurora carries over</SectionLabel>
            <FactList
              layout="stacked"
              facts={[
                { label: 'Your request', value: `${d.scenario.request.title} · ${d.scenario.request.location}` },
                { label: 'Last call', value: lastCall ? `${contactText(b.contact)}${lastCall.summary[0] ? ` — ${lastCall.summary[0]}` : ''}` : 'No call recorded in this history' },
              ]}
            />
          </section>
        </div>
      </Screen>
    )
  }

  /* 2 — review and approve */
  if (fu.phase === 'review') {
    return (
      <Screen title={`Call ${name}`} subtitle="Review before Aurora calls" back={false}>
        <div className="flex flex-col gap-4 px-4 py-4">
          <ApprovalPrompt
            risk="medium"
            action={`Call ${name} and ask ${asked.length} question${asked.length === 1 ? '' : 's'}`}
            detail={
              <span className="flex flex-col gap-2">
                <ol className="list-decimal pl-5">{asked.map((v) => <li key={v.requirement.id}>{v.requirement.question}</li>)}</ol>
                <span className="text-fg-muted">Already known and not asked again: {b.views.filter((v) => !fu.selected.includes(v.requirement.id) && v.primary).map((v) => v.requirement.short).join(', ') || 'nothing yet'}.</span>
              </span>
            }
            onApprove={() => dispatch({ type: 'FU_APPROVE' })}
            onDeny={() => dispatch({ type: 'FU_EDIT' })}
          />
        </div>
      </Screen>
    )
  }

  /* 3 — in progress: the same "Aurora is working" card as the live search, showing exactly what was approved. */
  if (fu.phase === 'queued' || fu.phase === 'calling' || fu.phase === 'interpreting') {
    const order = ['queued', 'calling', 'interpreting'] as const
    const at = order.indexOf(fu.phase)
    const STEP = ['Getting a line', `Calling ${name}`, 'Reading the answer']
    const n = asked.length
    const narration =
      fu.phase === 'queued' ? `Getting a line to ${name}. I’ll ask only what you approved.`
      : fu.phase === 'calling' ? `I’m on the line with ${name}, asking ${n === 1 ? 'your question' : `your ${n} questions`}.`
      : `I have their answer. I’m checking it against your request.`
    return (
      <Screen title={`Calling ${name}`} subtitle="Follow-up call" back={false}>
        <div className="flex flex-col gap-4 px-4 py-4">
          <WorkingEdge active label="Aurora is calling">
            <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <Spark />
                <div className="min-w-0 flex-1">
                  <StatusTicker current={STEP[at]} steps={STEP} label="Aurora status" className="text-body leading-5 font-medium" />
                </div>
                <span className="shrink-0 text-note text-fg-muted tabular-nums">{at + 1}/3</span>
              </div>
              <Narration key={narration} text={narration} />
              <section aria-label="What you approved" className="flex flex-col gap-2">
                <SectionLabel className="px-0!">Asking</SectionLabel>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {asked.map((v) => (
                    <li key={v.requirement.id} className="flex items-start gap-3 rounded-xl bg-sunken p-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center" aria-hidden>
                        {at === 2 ? <span className="grid size-5 place-items-center rounded-full bg-success text-on-success"><ApproveIcon width={14} height={14} /></span> : at === 1 ? <Eq /> : <span className="size-2 rounded-full bg-line-strong" />}
                      </span>
                      <span className="min-w-0 text-note leading-5 text-fg">{v.requirement.question}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <p className="m-0 text-note text-fg-muted">You can leave this screen. The call carries on and the answer will be waiting.</p>
              <div className="-mx-1 -mb-1 flex flex-wrap gap-1 border-t border-line pt-2">
                <Button size="lg" variant="ghost" onClick={nav.back}>Keep browsing</Button>
                <Button size="lg" variant="ghost" onClick={() => dispatch({ type: 'FU_CANCEL' })}>Cancel the call</Button>
              </div>
            </div>
          </WorkingEdge>
        </div>
      </Screen>
    )
  }

  /* 4 — result */
  const r = fu.result
  const done = () => { dispatch({ type: 'FU_CLOSE' }); nav.popTo({ name: 'business', id }) }
  const noInfo = !r || r.cancelled || r.changes.every((c) => c.statements.length === 0)
  return (
    <Screen title={`Result · ${name}`} subtitle="Follow-up call" back={false} footer={<div className="flex flex-col gap-2"><Button size="lg" className="w-full" onClick={done}>See {name}</Button>{r && !r.cancelled && <Button size="lg" variant="secondary" className="w-full" onClick={() => dispatch({ type: 'FU_RETRY' })}>Ask again</Button>}</div>}>
      <div className="flex flex-col gap-8 px-4 py-4">
        {r?.cancelled && <Notice tone="info" title="You cancelled the call">Nothing changed. Everything Aurora knew before is still here.</Notice>}
        {r && !r.cancelled && noInfo && (
          <Notice tone="warning" title={OUTCOME[r.outcome] ?? 'The call didn’t settle anything'}>
            Nothing about your requirements changed, and nothing was marked as not met. A call that doesn’t get an answer isn’t a no.
          </Notice>
        )}
        {r && !r.cancelled && !noInfo && (
          <>
            {r.suitabilityBefore && r.suitabilityAfter && (
              <section aria-label="Where it stands now" className="flex flex-wrap items-center gap-2">
                <Badge tone={SUITABILITY_COPY[r.suitabilityBefore].tone}>{SUITABILITY_COPY[r.suitabilityBefore].label}</Badge>
                <span aria-hidden>→</span>
                <Badge tone={SUITABILITY_COPY[r.suitabilityAfter].tone}>{SUITABILITY_COPY[r.suitabilityAfter].label}</Badge>
                <span className="sr-only">changed from {SUITABILITY_COPY[r.suitabilityBefore].label} to {SUITABILITY_COPY[r.suitabilityAfter].label}</span>
              </section>
            )}
            <section aria-label="What changed" className="flex flex-col gap-3">
              <SectionLabel className="px-0!">What changed</SectionLabel>
              <ul className="flex flex-col gap-4">
                {r.changes.map((c) => {
                  const req = b.views.find((v) => v.requirement.id === c.requirementId)!.requirement
                  return (
                    <li key={c.requirementId} className="flex flex-col gap-1">
                      <p className="text-row font-medium text-fg">{req.label}</p>
                      <p className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={c.before} />
                        <span aria-hidden>→</span>
                        <StatusBadge status={c.after} />
                      </p>
                      {c.statements.length === 0 ? <p className="text-note text-fg-muted">Not answered on this call. It stays as it was.</p> : c.statements.map((s) => <p key={s} className="text-body text-fg">{s}</p>)}
                      {c.condition && <p className="text-note text-fg-muted">Condition: {c.condition}</p>}
                      {c.conflict && <p className="text-note text-fg-muted">This differs from what was known before. Both answers are kept.</p>}
                    </li>
                  )
                })}
              </ul>
            </section>
            {r.stillOpen && r.stillOpen.length > 0 && (
              <section aria-label="Still open">
                <SectionLabel className="px-0!">Still open</SectionLabel>
                <p className="text-body text-fg-muted">{r.stillOpen.map((o) => `${b.views.find((v) => v.requirement.id === o.requirementId)!.requirement.short} (${statusLabel(o.display).toLowerCase()})`).join(' · ')}</p>
              </section>
            )}
          </>
        )}
        <Receipt title="What you approved" meta={`${asked.length} question${asked.length === 1 ? '' : 's'}`}>
          <ol className="list-decimal pl-5 text-body text-fg-muted">{asked.map((v) => <li key={v.requirement.id}>{v.requirement.question}</li>)}</ol>
        </Receipt>
      </div>
    </Screen>
  )
}
