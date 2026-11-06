// Change what Aurora is checking for: the budget, and how much each requirement matters. Answers already collected are re-checked at once; nobody is called.
import { Button, NumberField, SegmentedControl, Sheet } from '@tattva/ui'
import { useState } from 'react'
import { KIND_LABEL } from './labels'
import type { RequirementKind } from '../types'
import { useApp } from '../state/store'

export function RequirementsSheetButton({ label = 'Change a requirement', variant = 'secondary' }: { label?: string; variant?: 'ghost' | 'secondary' }) {
  const [open, setOpen] = useState(false)
  const { d, dispatch } = useApp()
  const budgetReq = d.requirements.find((r) => r.budget != null)
  return (
    <>
      <Button size="lg" variant={variant} onClick={() => setOpen(true)}>{label}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Change what Aurora checks" footer={<Button size="lg" onClick={() => setOpen(false)}>Done</Button>}>
        <div className="flex flex-col gap-6">
          <p className="text-note text-fg-muted">Answers Aurora already has are re-checked straight away. Nobody is called again.</p>
          {budgetReq?.budget != null && (
            <NumberField label="Maximum final price (₹)" unit="₹" value={budgetReq.budget} min={1000} step={1000} onChange={(v) => dispatch({ type: 'SET_BUDGET', value: v })} />
          )}
          <section aria-label="How much each requirement matters" className="flex flex-col gap-4">
            {d.requirements.map((r) => (
              <div key={r.id} className="flex flex-col gap-2">
                <p className="text-row font-medium text-fg">{r.label}</p>
                <SegmentedControl
                 
                  label={`How much “${r.short}” matters`}
                  value={r.kind}
                  onChange={(k: RequirementKind) => dispatch({ type: 'SET_KIND', id: r.id, kind: k })}
                  options={(['must_have', 'preference', 'informational'] as RequirementKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
                />
              </div>
            ))}
          </section>
        </div>
      </Sheet>
    </>
  )
}
