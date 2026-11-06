// Proof for one business: what it said against each of your requirements, where that came from and how old it is.
import { useState } from 'react'
import { Badge, Button, Callout, CallRecord, ClaimCheck, Collapsible, DataFreshness, GlobeIcon, SectionLabel, ShareIcon } from '@tattva/ui'
import { LocationIcon } from '../ui/LocationIcon'
import type { CallRecord as Call } from '../types'
import { basisOf, BASIS_LABEL, verdictLine, whyShown } from '../logic/agent'
import { contactText } from '../logic/contact'
import { keyConditions, nextAction, suggestedBusiness } from '../logic/copy'
import { STALE_HOURS, type RequirementView } from '../logic/evaluate'
import { shortName, when } from '../logic/format'
import { useApp } from '../state/store'
import { DemoButton } from '../ui/Demo'
import { Screen } from '../ui/Screen'
import { useLayer } from '../ui/StackNavigator'
import { useStartFollowUp } from '../ui/useStartFollowUp'
import { KIND_LABEL } from '../ui/labels'
import { BusinessPhoto } from '../ui/BusinessPhoto'
import { CARD_LABEL, StatusGlyph, SuitabilityBadge } from '../ui/vocab'

function EvidenceBody({ v, now }: { v: RequirementView; now: string }) {
  const isSim = v.current.some((e) => e.origin === 'simulated')
  return (
    <div className="mt-2 flex flex-col gap-3 pl-6">
      {v.alternative && <p className="text-body text-fg">{v.alternative} was offered instead — that isn’t an exact match.</p>}
      {v.current.length === 0 && <p className="text-body text-fg-muted">Nobody has been asked about this yet. That says nothing about whether it’s available.</p>}
      {v.current.map((e) => {
        const time = when(e.obtainedAt)
        return (
          <div key={e.id} className="flex flex-col gap-1">
            <p className="text-body text-fg">{e.statement}</p>
            {e.condition && <p className="text-body text-fg"><strong className="font-medium">Condition:</strong> {e.condition}</p>}
            {e.details && <ul className="list-disc pl-5 text-body text-fg-muted">{e.details.map((x) => <li key={x}>{x}</li>)}</ul>}
            {e.caveat && <p className="text-note text-fg-muted">{e.caveat}</p>}
            <p className="text-note text-fg-muted">
              {BASIS_LABEL[basisOf(e)]}
              {e.sourceDetail ? ` · ${e.sourceDetail}` : ''}
              {' · '}
              {time ?? 'time not recorded in the source'}
            </p>
            <div className="flex flex-wrap gap-2">
              {e.obtainedAt && v.requirement.timeSensitive && e.origin !== 'simulated' && <DataFreshness asOf={e.obtainedAt} now={now} staleAfter={STALE_HOURS * 3600} />}
              {e.round > 0 && <Badge tone="accent">Follow-up answer</Badge>}
            </div>
          </div>
        )
      })}
      {v.history.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          <p className="text-note font-medium text-fg-muted">Earlier answers{isSim ? ' (kept)' : ''}</p>
          {v.history.map((e) => <p key={e.id} className="text-note text-fg-muted">{e.statement} · {when(e.obtainedAt) ?? 'time not recorded'}</p>)}
        </div>
      )}
    </div>
  )
}

function RequirementRow({ v, now }: { v: RequirementView; now: string }) {
  return (
    <div className="border-b border-line py-1 last:border-b-0">
      <Collapsible
        headingLevel={3}
        header={
          <span className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 text-left">
            <span className="min-w-0 flex-1 text-row font-medium text-fg">{v.requirement.label}</span>
            <span className="inline-flex items-center gap-1.5 text-body font-medium text-fg"><StatusGlyph status={v.display} />{CARD_LABEL[v.display]}</span>
          </span>
        }
      >
        <EvidenceBody v={v} now={now} />
      </Collapsible>
    </div>
  )
}

function CallBlock({ c, name }: { c: Call; name: string }) {
  const done = ['answered', 'completed_with_information', 'completed_insufficient_information'].includes(c.outcome)
  const time = when(c.at)
  const label = c.outcome === 'no_answer' ? 'No one answered' : c.outcome === 'busy' ? 'Line busy' : c.outcome === 'declined' ? 'Declined' : c.outcome === 'technical_failure' ? 'Couldn’t connect' : c.outcome === 'cancelled' ? 'Cancelled' : 'Answered'
  return (
    <Collapsible headingLevel={3} header={<span className="text-row font-medium">{c.kind === 'follow_up' ? 'Follow-up call' : 'Original call'} · {time ?? 'time not recorded'} · {label}</span>}>
      <div className="mt-2 flex flex-col gap-3 pl-6">
        {c.summary.length > 0 && <ul className="list-disc pl-5 text-body text-fg">{c.summary.map((s) => <li key={s}>{s}</li>)}</ul>}
        {c.transcriptNote && <p className="text-note text-fg-muted">{c.transcriptNote}</p>}
        {c.transcript && c.transcript.length > 0 && (
          <CallRecord
            title={`${c.kind === 'follow_up' ? 'Follow-up' : 'Original'} call with ${name}`}
            status={done ? 'completed' : 'failed'}
            startedAt={time ?? 'Time not recorded'}
            duration={c.duration ?? 'Not recorded'}
            endedReason={label}
            speakerLabels={{ agent: 'Aurora', caller: name }}
            transcript={c.transcript.map((t, i) => ({ id: `${c.id}-${i}`, speaker: t.speaker === 'aurora' ? ('agent' as const) : ('caller' as const), text: t.text, time: t.at }))}
          />
        )}
      </div>
    </Collapsible>
  )
}

export function Business({ id }: { id: string }) {
  const { d } = useApp()
  const start = useStartFollowUp()
  const { sheet } = useLayer()
  const b = d.businesses.find((x) => x.business.id === id)
  if (!b) return <Screen title="Business"><p className="p-4 text-body text-fg-muted">This business isn’t available.</p></Screen>
  const suggested = d.evaluated && suggestedBusiness(d.businesses)?.business.id === id
  const why = whyShown(b, !!suggested, d.businesses)
  const act = nextAction(b)
  const musts = b.views.filter((v) => v.requirement.kind === 'must_have')
  const extras = b.views.filter((v) => v.requirement.kind !== 'must_have')
  const conditions = keyConditions(b)
  const name = shortName(b.business.name)
  const calls = [...b.calls].sort((x, y) => (x.at ?? '').localeCompare(y.at ?? ''))
  const [copied, setCopied] = useState(false)
  const where = `${b.business.name} ${(b.business.address ?? '').replace('…', '')} ${d.scenario.request.location}`.replace(/\s+/g, ' ').trim()
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}`
  const share = async () => {
    const data = { title: b.business.name, text: `${b.business.name}${b.business.address ? ` · ${b.business.address.replace('…', '')}` : ''}`, url: mapsUrl }
    try {
      if (navigator.share) await navigator.share(data)
      else { await navigator.clipboard.writeText(mapsUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    } catch { /* the person closed the share sheet */ }
  }
  const index = Math.max(0, d.businesses.findIndex((x) => x.business.id === id))
  const dist = b.business.distanceKm
  return (
    <Screen
      title={b.business.name}
      hero={<BusinessPhoto name={b.business.name} index={index} tall={sheet?.detent === 'full'} />}
      actions={sheet ? undefined : <DemoButton />}
      footer={
        act ? (
          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={() => (act.kind === 'followup' ? start(b.business.id, act.preselect) : undefined)} disabled={act.kind !== 'followup'}>{act.label}</Button>
            {'detail' in act && act.detail && <p className="text-note text-fg-muted">{act.detail}</p>}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8 px-4 pt-1 pb-4">
        {/* Where it is, and what you can do about it */}
        <section aria-label="Location" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            {dist != null && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center gap-1.5 self-start text-body font-medium text-accent before:absolute before:-inset-2.5 before:content-['']">
                <LocationIcon width={16} height={16} />
                {dist.toFixed(1)} km away
              </a>
            )}
            {b.business.address && <p className="m-0 text-body text-fg-muted">{b.business.address}</p>}
            {b.business.rating && <p className="m-0 text-note text-fg-muted">★ {b.business.rating.value} · {b.business.rating.note}</p>}
          </div>
          {b.business.addressDiscrepancy && <Callout tone="warning" title="Location differs between sources">{b.business.addressDiscrepancy}</Callout>}
          <div className={`grid gap-2 ${b.business.website ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Button size="lg" variant="secondary" onClick={() => window.open(directionsUrl, '_blank', 'noopener')}><LocationIcon width={16} height={16} />Directions</Button>
            <Button size="lg" variant="secondary" onClick={share}><ShareIcon width={16} height={16} />{copied ? 'Link copied' : 'Share'}</Button>
            {b.business.website && <Button size="lg" variant="secondary" onClick={() => window.open(`https://${b.business.website}`, '_blank', 'noopener')}><GlobeIcon width={16} height={16} />Website</Button>}
          </div>
        </section>

        {/* The answer */}
        <section aria-label="Summary" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SuitabilityBadge value={b.suitability} />
            <span className="text-note text-fg-muted">{contactText(b.contact)}</span>
          </div>
          <p className="text-answer text-fg">{verdictLine(b)}</p>
          <Collapsible headingLevel={3} header={<span className="text-row font-medium">Why this result?</span>}>
            <p className="mt-2 pl-6 text-body text-fg-muted">{why.reason}</p>
          </Collapsible>
        </section>

        {conditions.length > 0 && (
          <Callout tone="info" title="Conditions that change the answer">
            <ul className="list-disc pl-5">{conditions.map((c) => <li key={c.condition}><strong className="font-medium">{c.requirement}:</strong> {c.condition}</li>)}</ul>
          </Callout>
        )}

        <section aria-label="Your request, checked" className="flex flex-col gap-1">
          <SectionLabel className="px-0!">Your request, checked</SectionLabel>
          <p className="mb-1 text-note text-fg-muted">Tap a row for the exact words, the source and the time.</p>
          <div>
            {musts.map((v) => <RequirementRow key={v.requirement.id} v={v} now={d.ctx.now} />)}
          </div>
          {extras.length > 0 && (
            <>
              <SectionLabel className="px-0!">Also asked</SectionLabel>
              <div>{extras.map((v) => <RequirementRow key={v.requirement.id} v={v} now={d.ctx.now} />)}</div>
              <p className="text-note text-fg-muted">{KIND_LABEL.informational}: shown, but they don’t decide whether this business suits you.</p>
            </>
          )}
        </section>

        {b.business.displayedClaims && b.business.displayedClaims.length > 0 && (
          <section aria-label="What Aurora’s original result showed" className="flex flex-col gap-2">
            <SectionLabel className="px-0!">What Aurora’s original result showed</SectionLabel>
            <ClaimCheck
              segments={b.business.displayedClaims.flatMap((c, i) => [
                i > 0 ? ', ' : '',
                { id: `claim-${i}`, text: c, status: 'unsupported' as const, note: 'Shown on Aurora’s result with no visible source. It isn’t treated as verified.' },
              ])}
            />
          </section>
        )}

        <section aria-label="Calls" className="flex flex-col gap-1">
          <SectionLabel className="px-0!">Calls</SectionLabel>
          {calls.length === 0 && <p className="text-body text-fg-muted">No call is recorded for {name} in this history.</p>}
          {calls.map((c) => <CallBlock key={c.id} c={c} name={name} />)}
        </section>
      </div>
    </Screen>
  )
}
