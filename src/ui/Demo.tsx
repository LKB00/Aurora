// Prototype-only controls: switch scenario, move the clock forward, start over. Kept behind one button so the product screens stay product screens.
import { Badge, SectionLabel, TrayRow } from '@tattva/ui'
import { SCENARIOS } from '../data/scenarios'
import { useApp, useNav } from '../state/store'
import { Screen } from './Screen'

/** A tool for whoever is reviewing the prototype, not part of Aurora: a flat dashed "Scenarios" tag with a flask, in a mono face, no shadow, always top-right. Gap: drawn here, Tattva has no flask. */
export function DemoButton() {
  const nav = useNav()
  return (
    <button type="button" aria-label="Scenarios" title="Scenarios" onClick={() => nav.push({ name: 'controls' })} className="group grid h-11 min-w-11 cursor-pointer place-items-center justify-self-end rounded-full px-1">
      <span className="flex h-7 items-center gap-1 rounded-md border border-dashed border-line-strong px-2 font-mono text-[11px] leading-none font-medium tracking-wider text-fg-subtle uppercase group-hover:text-fg group-active:bg-pressed">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /><path d="M7.5 15h9" /></svg>
        Scenarios
      </span>
    </button>
  )
}

// The scenarios sheet, for whoever is reviewing the design: jump to any moment Aurora handles. Same sheet as every other.
export function Controls() {
  const { state, dispatch } = useApp()
  const groups = [...new Set(SCENARIOS.map((s) => s.group))]
  return (
    <Screen title="Scenarios">
      <div className="flex flex-col gap-8 px-4 py-4">
        <p className="m-0 text-body leading-6 text-fg-muted">Jump to any moment in Aurora, from a successful search to the ways it can go wrong.</p>
        {groups.map((g) => (
          <section key={g} aria-label={g} className="flex flex-col gap-2">
            <SectionLabel className="px-0!">{g}</SectionLabel>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {SCENARIOS.filter((s) => s.group === g).map((s) => (
                <TrayRow
                  key={s.id}
                  title={s.name}
                  detail={s.description}
                  trailing={s.id === state.scenarioId ? <Badge tone="accent">Showing</Badge> : undefined}
                  onClick={() => dispatch(s.intro ? { type: 'BEGIN', id: s.id } : { type: 'LOAD_SCENARIO', id: s.id })}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Screen>
  )
}
