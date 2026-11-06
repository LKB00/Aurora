// Expanding and collapsing content that glides instead of snapping: the height eases open on the shared spring curve while
// the content fades in. Closed content is hidden from taps and screen readers (inert).
import type { ReactNode } from 'react'

export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className="grid transition-[grid-template-rows,opacity] duration-(--dur-spring) ease-(--ease-spring) motion-reduce:transition-none"
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
