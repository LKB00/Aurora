// One business, judged against the user's must-haves. Built from Tattva's ResultCard: name, a few facts, a tag and one action.
import { Badge, Button, Checkbox, ChevronIcon } from '@tattva/ui'
import { LocationIcon } from './LocationIcon'
import type { BusinessView } from '../logic/evaluate'
import { inr } from '../logic/format'
import { contactText } from '../logic/contact'
import { nextAction } from '../logic/copy'
import { useApp, useNav } from '../state/store'
import { useStartFollowUp } from './useStartFollowUp'
import { BusinessPhoto } from './BusinessPhoto'
import { CARD_LABEL, STATUS_TONE, StatusGlyph, SUITABILITY_COPY } from './vocab'

export function BusinessCard({ b, evaluated = true, primary = false, select }: { b: BusinessView; evaluated?: boolean; primary?: boolean; select?: { selected: boolean; disabled: boolean; onToggle: () => void } }) {
  const { d } = useApp()
  const nav = useNav()
  const start = useStartFollowUp()
  const act = nextAction(b)
  const run = () => (act?.kind === 'followup' ? start(b.business.id, act.preselect) : nav.push({ name: 'business', id: b.business.id }))
  const musts = b.views.filter((v) => v.requirement.kind === 'must_have')
  const suit = SUITABILITY_COPY[b.suitability]
  // Three different kinds of information, kept apart:
  //  1. who and where: name, with the distance beside it (a property of the place, used to choose between them)
  //  (inside a group the group heading already says the verdict; only the lone "worth checking next" card carries its own badge)
  //  2. can they do what I need: the verdict, then one line per must-have (the evidence)
  //  3. how Aurora found out: how many calls it took, as a caption under the evidence (provenance, not a feature of the business)
  // A tick = confirmed, cross = not available, "i" = partly known, empty ring = nothing known yet.
  const allUnknown = musts.length > 0 && musts.every((v) => STATUS_TONE[v.display] === 'neutral')
  const rows = musts.map((v) => {
    return (
      <li key={v.requirement.id} className="flex items-baseline justify-between gap-4">
        <span className="text-body text-fg-muted">{v.requirement.short}</span>
        <span className="flex flex-col items-end gap-0.5 text-right">
          <span className="inline-flex items-center gap-1.5 text-body font-medium text-fg">
            <StatusGlyph status={v.display} />
            {CARD_LABEL[v.display]}
          </span>
          {v.alternative && <span className="text-note text-fg-muted">{v.alternative} offered instead</span>}
        </span>
      </li>
    )
  })
  const priceV = b.views.find((v) => v.requirement.id === 'price')?.primary
  const quoted = priceV?.priceValue != null ? priceV.priceValue : null
  const open = () => nav.push({ name: 'business', id: b.business.id })
  const dist = b.business.distanceKm
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.business.name} ${(b.business.address ?? '').replace('…', '')} ${d.scenario.request.location}`.replace(/\s+/g, ' ').trim())}`
  return (
    <div
      onClick={select && !select.disabled ? select.onToggle : undefined}
      className={`overflow-hidden rounded-card border bg-surface transition-opacity ${select?.selected ? 'border-accent' : 'border-line'} ${select?.disabled && !select.selected ? 'opacity-50' : ''} ${select && !select.disabled ? 'cursor-pointer' : ''}`}
    >
      <BusinessPhoto name={b.business.name} index={Math.max(0, d.businesses.findIndex((x) => x.business.id === b.business.id))} />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
          <h3 className="m-0 font-sans! text-lead leading-6 font-semibold text-fg [overflow-wrap:anywhere]">{b.business.name}</h3>
          {dist != null && (
            // A link, not a button: it leaves the app to Google Maps. One cue is enough: the pin, in the link colour.
            // The extra 8px around it is invisible tap area, so the 44pt target doesn't push the layout.
            <a
              href={mapsUrl}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`About ${dist.toFixed(1)} kilometres away, a straight-line estimate. Open ${b.business.name} in Google Maps`}
              className="relative mt-1 inline-flex items-center gap-1.5 text-body font-medium text-accent before:absolute before:-inset-2.5 before:content-['']"
            >
              <LocationIcon width={16} height={16} />
              ≈{dist.toFixed(1)} km
            </a>
          )}
          </div>
          {select && (
            <div className="pointer-events-none shrink-0">
              <Checkbox checked={select.selected} disabled={select.disabled && !select.selected} onChange={select.onToggle} label={<span className="sr-only">Compare {b.business.name}</span>} />
            </div>
          )}
        </div>
        {quoted != null && (
          <div>
            <p className="m-0 text-subhead leading-6 font-semibold text-fg">{inr(quoted)}</p>
            <p className="m-0 text-note text-fg-muted">Quoted on a call</p>
          </div>
        )}
        {evaluated && primary && <div><Badge tone={suit.tone}>{suit.label}</Badge></div>}
        {allUnknown ? (
          <div>
            <p className="m-0 text-body font-medium text-fg">No answers yet</p>
            <p className="m-0 text-note text-fg-muted">{contactText(b.contact)}</p>
          </div>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{rows}</ul>
            <p className="m-0 text-note text-fg-muted">{contactText(b.contact)}</p>
          </>
        )}
      </div>
      {!select && <div className="flex flex-col gap-3 border-t border-line p-4">
        {primary ? (
          <Button size="lg" className="w-full" onClick={run}>{act?.label ?? 'View details'}</Button>
        ) : (
          <Button size="lg" variant="secondary" className="w-full" onClick={run}>{act?.label ?? 'View details'}</Button>
        )}
        <Button size="lg" variant="ghost" className="w-full" onClick={open}>View details<ChevronIcon className="size-4" /></Button>
      </div>}
    </div>
  )
}
