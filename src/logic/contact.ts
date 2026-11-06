// What really happened on the calls, in words. Different outcomes are different events with different next steps – never one "no answer".
import type { ContactOutcome } from '../types'
import type { ContactSummary } from './evaluate'

export function contactText(c: ContactSummary): string {
  // When some calls connected and some didn’t, say so – “2 attempts” alone hides that one of them worked.
  const tries = c.attempts > 1 ? (c.reached ? ` · ${c.answered} of ${c.attempts} calls answered` : ` · ${c.attempts} attempts`) : ''
  const map: Record<ContactOutcome, string> = {
    not_attempted: 'Not contacted',
    queued: 'Queued to call',
    calling: 'Calling now',
    answered: 'Answered' + tries,
    no_answer: (c.reached ? 'Last call not answered' : 'Not reached') + tries,
    busy: 'Line busy' + tries,
    declined: 'Call declined' + tries,
    technical_failure: 'Last call failed' + tries,
    completed_insufficient_information: 'Answered · nothing useful' + tries,
    completed_with_information: 'Answered' + tries,
    cancelled: 'Last call cancelled' + tries,
  }
  // “Answered · 1 of 2 calls answered” says it twice.
  return map[c.state].replace(/^Answered · (\d+ of \d+ calls answered)$/, 'Reached · $1')
}
