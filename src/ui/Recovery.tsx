// A dead end never stays a dead end: what happened, what is saved, and one thing to do next.
import { Button } from '@tattva/ui'
import { Notice } from './Notice'
import type { RecoveryAction } from '../types'
import { useApp } from '../state/store'
import { RequirementsSheetButton } from './Requirements'

/** `inside`: already within a card that has its own headline, so only the explanation and the action are shown. */
export function Recovery({ inside }: { inside?: boolean } = {}) {
  const { d, dispatch } = useApp()
  const r = d.scenario.recovery
  if (!r) return null
  const act = (a: RecoveryAction) => {
    if (a.kind === 'load_scenario') dispatch({ type: 'LOAD_SCENARIO', id: a.scenarioId })
    if (a.kind === 'resume') dispatch({ type: 'RESUME' })
  }
  const actions = r.actions.map((a) =>
    a.kind === 'edit_request' ? (
      <RequirementsSheetButton key="edit" label="Change my request" variant="secondary" />
    ) : (
      <Button size="lg" key={a.kind === 'load_scenario' ? a.scenarioId : a.kind} variant="secondary" onClick={() => act(a)}>
        {a.kind === 'load_scenario' ? a.label : 'Resume search'}
      </Button>
    ),
  )
  if (inside)
    return (
      <div>
        <p className="m-0 text-body leading-6 text-fg-muted">{r.body} {r.preserved}</p>
        <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
      </div>
    )
  return (
    <Notice tone="warning" title={r.title} actions={actions}>
      <p>{r.body}</p>
      <p>{r.preserved}</p>
    </Notice>
  )
}
