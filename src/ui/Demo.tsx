// Prototype-only controls: switch scenario, move the clock forward, start over. Kept behind one button so the product screens stay product screens.
import { Badge, Button, SectionLabel, SegmentedControl, TrayRow } from '@tattva/ui'
import { SCENARIOS } from '../data/scenarios'
import { useApp, useNav } from '../state/store'
import { Screen } from './Screen'

/** A tool for whoever is reviewing the prototype, not part of Aurora: a flat dashed "DEMO" tag with a flask, in a mono face, no shadow, always top-right. Gap: drawn here, Tattva has no flask. */
export function DemoButton() {
  const nav = useNav()
  return (
    <button type="button" aria-label="Prototype controls" title="Prototype controls" onClick={() => nav.push({ name: 'controls' })} className="group grid h-11 min-w-11 cursor-pointer place-items-center justify-self-end rounded-full px-1">
      <span className="flex h-7 items-center gap-1 rounded-md border border-dashed border-line-strong px-2 font-mono text-[11px] leading-none font-medium tracking-wider text-fg-subtle uppercase group-hover:text-fg group-active:bg-pressed">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /><path d="M7.5 15h9" /></svg>
        Demo
      </span>
    </button>
  )
}

// The controls are a sheet like every other: same opening, same handle, same scroll edges.
export function Controls() {
  const { state, d, dispatch } = useApp()
  const groups = [...new Set(SCENARIOS.map((s) => s.group))]
  return (
    <Screen title="Prototype controls" footer={<Button size="lg" variant="secondary" className="w-full" onClick={() => dispatch({ type: 'RESET' })}>Start this scenario over</Button>}>
      <div className="flex flex-col gap-8 px-4 py-4">
        <p className="m-0 text-note text-fg-muted">
          This is an experiment. Nothing here calls a real business. {d.scenario.simulatedNote} Business photos are unrelated stock images of real shops (Wikimedia Commons), not these businesses.
        </p>
        {groups.map((g) => (
          <section key={g} aria-label={g} className="flex flex-col gap-2">
            <SectionLabel className="px-0!">{g}</SectionLabel>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {SCENARIOS.filter((s) => s.group === g).map((s) => (
                <TrayRow
                  key={s.id}
                  title={s.name}
                  detail={s.description}
                  trailing={s.id === state.scenarioId ? <Badge tone="accent">Showing</Badge> : 'Open'}
                  onClick={() => dispatch({ type: 'LOAD_SCENARIO', id: s.id })}
                />
              ))}
            </ul>
          </section>
        ))}
        <section aria-label="Clock" className="flex flex-col gap-2">
          <SectionLabel className="px-0!">Move the clock forward</SectionLabel>
          <p className="m-0 text-note text-fg-muted">Answers about stock, slots and prices go out of date. This shows what that looks like.</p>
          <SegmentedControl
            label="Hours ahead"
            value={String(state.hoursAhead)}
            onChange={(v) => dispatch({ type: 'SET_HOURS_AHEAD', value: Number(v) })}
            options={[{ value: '0', label: 'Now' }, { value: '6', label: '+6 h' }, { value: '14', label: '+14 h' }, { value: '24', label: '+1 day' }]}
          />
        </section>
      </div>
    </Screen>
  )
}
