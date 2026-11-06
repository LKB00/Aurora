// One status vocabulary for every screen (cards, details, comparison, follow-up, legend).
// Labels and explanations live here; icons and colours are added in components/status.tsx.

import type { DisplayStatus } from './evaluate'

export type Tone = 'green' | 'amber' | 'red' | 'grey'

export const STATUS: Record<DisplayStatus, { label: string; tone: Tone; help: string }> = {
  confirmed: { label: 'Confirmed by business', tone: 'green', help: 'The business said this on a call. It records what they said at that time — not a guarantee it won’t change.' },
  listed: { label: 'Reported by another source', tone: 'grey', help: 'A website, map or directory shows this. It doesn’t confirm live stock, prices or slots — only the business can.' },
  conditional: { label: 'Conditional', tone: 'amber', help: 'A yes that depends on something — an inspection, a drop-off, a time. The condition is always shown.' },
  conflicting: { label: 'Conflicting information', tone: 'amber', help: 'Two sources or answers disagree. Both are kept, and neither is treated as confirmed.' },
  awaiting: { label: 'Awaiting confirmation', tone: 'amber', help: 'The business said it would check. No answer has come back yet.' },
  outdated: { label: 'Outdated information', tone: 'amber', help: 'This was confirmed a while ago. Stock, prices and slots change — ask again before relying on it. This prototype flags volatile answers older than 12 hours; that cut-off is a stand-in, not Aurora’s policy.' },
  not_met: { label: 'Does not meet', tone: 'red', help: 'The evidence explicitly says this requirement isn’t met.' },
  unanswered: { label: 'Insufficient information', tone: 'grey', help: 'There was contact, but it didn’t establish this.' },
  no_answer: { label: 'Not reached', tone: 'grey', help: 'Aurora called but nobody answered. That says nothing about whether they can help.' },
  not_checked: { label: 'Not checked', tone: 'grey', help: 'Nobody has asked about this yet. That says nothing about whether it’s available.' },
  unattributed: { label: 'Source not established', tone: 'amber', help: 'Aurora’s original result displayed this, but no source for it is visible. It isn’t treated as verified.' },
  not_applicable: { label: 'Doesn’t apply', tone: 'grey', help: 'This question doesn’t apply to this business.' },
}

/** Order used by the legend. */
export const STATUS_ORDER: DisplayStatus[] = [
  'confirmed', 'listed', 'conditional', 'conflicting', 'awaiting', 'outdated', 'not_met', 'unanswered', 'no_answer', 'not_checked', 'unattributed', 'not_applicable',
]
