import { useState } from 'react'
// The answer to "did Aurora find something that suits me?" — outcome first, then businesses grouped by what was actually confirmed.
import { Button, ChevronIcon, SectionLabel } from '@tattva/ui'
import { outcomeCopy, suggestedBusiness } from '../logic/copy'
import { useApp, useNav } from '../state/store'
import { BusinessCard } from '../ui/BusinessCard'
import { DemoButton } from '../ui/Demo'
import { Reveal } from '../ui/Reveal'
import { Recovery } from '../ui/Recovery'
import { Screen } from '../ui/Screen'
import { SUITABILITY_COPY, SUITABILITY_ORDER } from '../ui/vocab'

export function Results() {
  const { state, d, dispatch } = useApp()
  const nav = useNav()
  const copy = outcomeCopy(d.outcome, d.process, d.businesses)
  const featured = d.evaluated ? suggestedBusiness(d.businesses) : null
  const rest = d.businesses.filter((b) => b !== featured)
  const deadEnd = d.evaluated && d.scenario.recovery && (d.outcome === 'no_businesses_found' || d.outcome === 'no_suitable_option_found')
  // Choosing what to compare: tap "Compare", pick two or three, confirm. (Ten businesses side by side is unreadable on a phone.)
  const MAX = 3
  const [picking, setPicking] = useState(false)
  const chosen = state.compare
  const startPicking = () => { dispatch({ type: 'SET_COMPARE', ids: [] }); setPicking(true) }
  const stopPicking = () => { dispatch({ type: 'SET_COMPARE', ids: [] }); setPicking(false) }
  const goCompare = () => { setPicking(false); nav.push({ name: 'compare' }) }
  const selectFor = (id: string) =>
    picking ? { selected: chosen.includes(id), disabled: chosen.length >= MAX, onToggle: () => dispatch({ type: 'TOGGLE_COMPARE', id }) } : undefined
  return (
    <Screen
      title={d.scenario.request.title}
      subtitle={picking ? (chosen.length === 0 ? 'Choose 2 or 3 to compare' : chosen.length < 2 ? '1 chosen · pick one more' : chosen.length === MAX ? '3 chosen · the most you can compare' : `${chosen.length} chosen · add one more or compare`) : `${d.scenario.request.location} · Results`}
      actions={<DemoButton />}
      footer={
        d.businesses.length < 2 ? undefined : picking ? (
          <div className="flex gap-2">
            <Button size="lg" variant="secondary" onClick={stopPicking}>Cancel</Button>
            <Button size="lg" className="flex-1" disabled={chosen.length < 2} onClick={goCompare}>{chosen.length >= 2 ? `Compare ${chosen.length}` : chosen.length === 1 ? 'Pick one more' : 'Pick two to compare'}</Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={startPicking}>Compare businesses</Button>
        )
      }
    >
      {/* While picking what to compare, everything but the cards folds away. */}
      <div className="flex flex-col px-4 py-4">
        <Reveal open={!picking}>
          <div className="flex flex-col gap-8 pb-8">
            <section aria-label="Outcome">
              <h2 className="m-0 text-subhead leading-6 font-semibold text-fg">{copy.title}</h2>
              <p className="m-0 mt-1 text-body leading-6 text-fg-muted">{copy.body}</p>
              {state.budget != null && (
                <p className="mt-2 text-note text-fg-muted">
                  {d.requirements.some((r) => r.budget != null) ? 'Budget changed. Known prices were re-checked; nobody was called again.' : 'Budget noted. This request has no price limit, so no answers changed; nobody was called.'}
                </p>
              )}
            </section>
            {deadEnd && <Recovery inside />}
          </div>
        </Reveal>

        {featured && (
          <section aria-label="Worth checking next" className={`flex flex-col transition-[padding] duration-(--dur-spring) ease-(--ease-spring) ${picking ? 'pb-4' : 'pb-8'}`}>
            <Reveal open={!picking}><div className="pb-3"><SectionLabel className="px-0!">Worth checking next</SectionLabel></div></Reveal>
            <BusinessCard b={featured} evaluated={d.evaluated} primary select={selectFor(featured.business.id)} />
          </section>
        )}

        {SUITABILITY_ORDER.map((s) => {
          const list = rest.filter((b) => b.suitability === s)
          if (!list.length) return null
          const c = SUITABILITY_COPY[s]
          return (
            <section key={s} aria-label={c.group} className={`flex flex-col transition-[padding] duration-(--dur-spring) ease-(--ease-spring) ${picking ? 'pb-4' : 'pb-8'}`}>
              <Reveal open={!picking}>
                <div className="flex flex-col gap-1 pb-3">
                  <SectionLabel className="px-0!" action={<span className="text-note text-fg-muted">{list.length}</span>}>{c.group}</SectionLabel>
                  <p className="text-note text-fg-muted">{c.note}</p>
                </div>
              </Reveal>
              <div className="flex flex-col gap-4">{list.map((b) => <BusinessCard key={b.business.id} b={b} evaluated={d.evaluated} select={selectFor(b.business.id)} />)}</div>
            </section>
          )
        })}

        <Reveal open={!picking}>
          <Button size="lg" variant="ghost" className="self-start" onClick={() => nav.push({ name: 'progress' })}>How Aurora got here<ChevronIcon className="size-4" /></Button>
        </Reveal>
      </div>
    </Screen>
  )
}
