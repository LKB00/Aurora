// A dead end never stays a dead end: what happened, what is saved, and one thing to do next.
import { Button, Callout } from '@tattva/ui'
import type { RecoveryAction } from '../types'
import { useApp } from '../state/store'
import { RequirementsSheetButton } from './Requirements'

export function Recovery() {
  const { d, dispatch } = useApp()
  const r = d.scenario.recovery
  if (!r) return null
  const act = (a: RecoveryAction) => {
    if (a.kind === 'load_scenario') dispatch({ type: 'LOAD_SCENARIO', id: a.scenarioId })
    if (a.kind === 'resume') dispatch({ type: 'RESUME' })
  }
  return (
    <Callout tone="warning" title={r.title}>
      <p>{r.body}</p>
      <p className="mt-1 text-fg-muted">{r.preserved}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {r.actions.map((a) =>
          a.kind === 'edit_request' ? (
            <RequirementsSheetButton key="edit" label="Change my request" variant="secondary" />
          ) : (
            <Button size="lg" key={a.kind === 'load_scenario' ? a.scenarioId : a.kind} variant="secondary" onClick={() => act(a)}>
              {a.kind === 'load_scenario' ? a.label : 'Resume search'}
            </Button>
          ),
        )}
      </div>
    </Callout>
  )
}
