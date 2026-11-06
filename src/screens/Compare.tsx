// Side by side, against your requirements. It never picks a winner — Aurora's rank and match score are not used here.
import { Button, Callout, ComparisonTable, EmptyState } from '@tattva/ui'
import { contactText } from '../logic/contact'
import { shortName } from '../logic/format'
import { useApp, useNav } from '../state/store'
import { DemoButton } from '../ui/Demo'
import { Screen } from '../ui/Screen'
import { StatusBadge, SuitabilityBadge } from '../ui/vocab'

export function Compare() {
  const { state, d, dispatch } = useApp()
  const nav = useNav()
  const items = state.compare.map((id) => d.businesses.find((b) => b.business.id === id)).filter((b) => !!b)
  if (items.length < 2) {
    return (
      <Screen title="Compare" actions={<DemoButton />}>
        <div className="p-4">
          <EmptyState variant="cleared" title="Pick two businesses to compare" action={<Button size="lg" onClick={nav.back}>Back to results</Button>}>
            Comparing needs at least two. You can also open one business to see all of its evidence.
          </EmptyState>
        </div>
      </Screen>
    )
  }
  const shown = items.slice(0, 5)
  const reqs = d.requirements
  const rows = [
    { id: 'suit', label: 'Overall', values: shown.map((b) => <SuitabilityBadge key={b.business.id} value={b.suitability} />) },
    { id: 'call', label: 'Call', values: shown.map((b) => contactText(b.contact)) },
    ...[...reqs].sort((a, b) => Number(b.kind === 'must_have') - Number(a.kind === 'must_have')).map((r) => ({
      id: r.id,
      label: r.kind === 'must_have' ? `${r.label} (must-have)` : r.label,
      values: shown.map((b) => {
        const v = b.views.find((x) => x.requirement.id === r.id)!
        return (
          <span key={b.business.id} className="flex flex-col items-start gap-1">
            <StatusBadge status={v.display} />
            {v.alternative && <span className="text-note text-fg-muted">{v.alternative} offered instead</span>}
            {v.primary && v.display !== 'not_checked' && <span className="text-note text-fg-muted">{v.primary.statement}</span>}
          </span>
        )
      }),
    })),
  ]
  return (
    <Screen title="Compare" subtitle={`${shown.length} businesses · against your request`} actions={<DemoButton />}>
      <div className="flex flex-col gap-8 px-4 py-4">
        <Callout tone="info" title="No winner is picked">Aurora’s rank and match score aren’t used here. Unknown means nobody has said — not that it’s a no.</Callout>
        <ComparisonTable
          caption="Your requirements, business by business"
          attributeLabel="Requirement"
          items={shown.map((b) => ({ id: b.business.id, name: shortName(b.business.name), subtitle: b.business.distanceKm != null ? `${b.business.distanceKm.toFixed(1)} km away` : b.business.address }))}
          rows={rows}
        />
        <section aria-label="Next" className="flex flex-col gap-2">
          {shown.map((b) => (
            <div key={b.business.id} className="flex items-center justify-between gap-2">
              <Button size="lg" variant="secondary" onClick={() => nav.push({ name: 'business', id: b.business.id })}>View {shortName(b.business.name)}</Button>
              <Button size="lg" variant="secondary" onClick={() => dispatch({ type: 'TOGGLE_COMPARE', id: b.business.id })}>Remove</Button>
            </div>
          ))}
        </section>
      </div>
    </Screen>
  )
}
