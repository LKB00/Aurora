// One calm notice for everything that is not the happy path: a search that paused or failed, nothing found, a call that didn't settle, a note about the data.
// It replaces Tattva's filled Callout (orange/red boxes). Same family as the "Needs your decision" block: a quiet surface, a small round icon whose colour carries the tone,
// a title, plain text and the next action. Gap: Tattva has no such quiet notice and no info icon, so the "i" is drawn here.
import { NeedsReviewIcon } from '@tattva/ui'
import type { ReactNode } from 'react'

type Tone = 'info' | 'warning' | 'danger'
const TONE: Record<Tone, string> = { info: 'bg-surface text-fg-muted ring-line', warning: 'bg-warning-soft text-warning-fg ring-transparent', danger: 'bg-danger-soft text-danger-fg ring-transparent' }

export function Notice({ tone = 'info', title, children, actions }: { tone?: Tone; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl bg-sunken p-4">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ring-1 ${TONE[tone]}`} aria-hidden>
        {tone === 'info' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
        ) : (
          <NeedsReviewIcon width={16} height={16} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-body leading-6 font-semibold text-fg">{title}</p>
        {children && <div className="mt-0.5 text-body leading-6 text-fg-muted [&_p+p]:mt-1">{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
