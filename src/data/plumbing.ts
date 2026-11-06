// Plumbing journey – cross-category check for conditional service mode and location conflicts.
// OBSERVED: brief §7. Call times were not captured, so no timestamps are shown.
// Budget amount wasn't captured either, so no number is invented. Follow-up answers are SIMULATED.

import type { Business, CallRecord, Evidence, FollowUpScript, ListedBusiness, Requirement, SearchRequest, TimelineStep } from '../types'
import { ev, step } from './helpers'

export const plumbingRequest: SearchRequest = {
  title: 'Plumbing leak repair',
  location: 'Sector 3',
  text: 'Plumbing leak repair near Sector 3, Bengaluru — a leaking ½-inch PVC pipe joint, fixed today.',
  acknowledgement: 'Got it — I’m checking plumbers and hardware stores near Sector 3. Here’s what I understood.',
  note: 'The exact wording of this search wasn’t captured, and no budget amount was recorded. This summary is based on what the calls discussed.',
  interpretation: [
    { label: 'Service', value: 'Leak repair', note: '½-inch PVC pipe joint' },
    { label: 'Where', value: 'Near Sector 3' },
    { label: 'When', value: 'Today' },
    { label: 'Budget', value: 'Not recorded', note: 'price will be collected as information' },
  ],
}

export const plumbingRequirements: Requirement[] = [
  { id: 'repair', label: 'Repairs a ½-inch PVC leak joint', short: 'Leak repair', kind: 'must_have', question: 'Can you repair a leaking ½-inch PVC pipe joint?' },
  { id: 'sameday', label: 'Repaired today', short: 'Today', kind: 'must_have', timeSensitive: true, question: 'Can it be repaired today?' },
  // No budget amount was recorded in the research, so price is information to collect – not a fit test.
  { id: 'cost', label: 'Total cost', short: 'Cost', kind: 'informational', question: 'What is the total cost, including parts and labour?' },
  { id: 'mode', label: 'How the repair is done', short: 'Service type', kind: 'informational', question: 'Do you come to the house, or do I bring the pipe to you?' },
  { id: 'area', label: 'Near Sector 3', short: 'Location', kind: 'preference', question: 'Where exactly is your shop?' },
]

export const plumbingBusinesses: Business[] = [
  {
    id: 'm1', name: 'Meenakshi Hardware & Sanitary', initial: 'M', distanceKm: 1.1, auroraRank: 1, auroraMatch: 100, revealStep: 0, origin: 'observed',
    address: 'Old Madiwala / Dollar Scheme Colony, Bengaluru',
    addressDiscrepancy: 'Location not reconciled: Aurora’s profile shows Old Madiwala / Dollar Scheme Colony, but the call summary describes the shop as being in BTM Layout.',
    rating: { value: 4.2, note: 'Rating as shown in Aurora (20 reviews)' },
    displayedClaims: ['₹20', 'Leak repair', 'Same-day repair', 'Drop-off supported', 'Within budget', '100% match'],
  },
  { id: 'kaveri', name: 'Kaveri Hardware', initial: 'K', distanceKm: 2.7, revealStep: 0, origin: 'observed' },
]

export const plumbingCalls: CallRecord[] = [
  {
    id: 'm1-c1', businessId: 'm1', kind: 'original', outcome: 'completed_with_information', at: null, origin: 'observed',
    summary: [
      '½-inch PVC leak-joint repair may be possible if you bring the pipe to the shop',
      '₹20 total, including collar and labour',
      'Same-day drop-off repair; inspection still pending',
      'Location described as BTM Layout, Bengaluru',
    ],
    transcriptNote: 'Noisy Hindi/English call with repeated clarifications about the repair, the location and the budget. The transcript isn’t reproduced here; it may contain transcription errors.',
  },
  { id: 'kaveri-c1', businessId: 'kaveri', kind: 'original', outcome: 'completed_insufficient_information', at: null, origin: 'observed', summary: ['The store did not provide useful information'] },
]

/** Observed: noisy Hindi/English call with repeated clarifications (research log §7.3). */
const M1_LINE = 'Noisy call with repeated clarifications – the summary may not capture everything accurately.'
const cond = 'In-shop repair only: you bring the pipe to the shop. Inspection is still pending.'
export const plumbingEvidence: Evidence[] = [
  ev('m1', 'repair', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'A ½-inch PVC leak-joint repair may be possible at the shop.', condition: cond, sourceDetail: 'Call summary', obtainedAt: null, callId: 'm1-c1', origin: 'observed', caveat: M1_LINE }),
  ev('m1', 'sameday', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'Same-day repair if the pipe is dropped off.', condition: cond, sourceDetail: 'Call summary', obtainedAt: null, callId: 'm1-c1', origin: 'observed', caveat: M1_LINE }),
  ev('m1', 'cost', {
    source: 'business_call', status: 'business_stated', fit: 'meets', statement: '₹20, including collar and labour.',
    condition: 'Amount from the call summary, not a guaranteed final price: inspection is still pending, and the call was noisy.',
    sourceDetail: 'Call summary (the transcript was noisy; the amount followed repeated clarification)', obtainedAt: null, callId: 'm1-c1', origin: 'observed', caveat: M1_LINE,
  }),
  ev('m1', 'mode', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'In-shop (drop-off) repair — not an on-site plumbing visit.', condition: 'You bring the pipe in, and they inspect it before repairing.', sourceDetail: 'Call summary', obtainedAt: null, callId: 'm1-c1', origin: 'observed', caveat: M1_LINE }),
  ev('m1', 'area', { source: 'app_or_directory', status: 'conflicting', fit: 'unknown', statement: 'Business profile: Old Madiwala / Dollar Scheme Colony.', sourceDetail: 'Aurora business profile', obtainedAt: null, origin: 'observed' }),
  ev('m1', 'area', { source: 'business_call', status: 'conflicting', fit: 'unknown', statement: 'Call summary: BTM Layout, Bengaluru.', sourceDetail: 'Call summary', obtainedAt: null, callId: 'm1-c1', origin: 'observed', caveat: M1_LINE }),
  ev('kaveri', 'repair', { source: 'business_call', status: 'insufficient_information', fit: 'unknown', statement: 'The store didn’t provide useful information.', sourceDetail: 'AI summary', obtainedAt: null, callId: 'kaveri-c1', origin: 'observed' }),
]

export const plumbingListed: ListedBusiness[] = [
  { name: 'Dial4helps – Water P…', shownStatus: 'In call list' },
  { name: 'Jagan Plumber', shownStatus: 'In call list' },
  { name: 'Sri Krishna Hardware…', shownStatus: 'In call list' },
  { name: 'Ravi Plumbing Service…', shownStatus: 'In call list' },
]
export const plumbingCountsNote =
  'The final screen showed 50 businesses, 1 website and 56 calls. Other progress screens showed different values; they aren’t reconciled here.'

export const plumbingTimeline: TimelineStep[] = [
  step('completed', ['done', '50 businesses found'], ['done', 'Calls completed'], ['done', 'Results ranked']),
]

export const plumbingScripts: Record<string, Partial<Record<'answered', FollowUpScript>>> = {
  m1: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 58s',
      summary: ['Shop is in BTM 1st Stage', 'Can repair today if the pipe arrives before 6 PM', 'Still drop-off only'],
      answers: {
        area: { fit: 'meets', status: 'business_stated', statement: 'Said the shop is in BTM 1st Stage.' },
        sameday: { fit: 'meets', status: 'business_stated', statement: 'Can repair it today.', condition: 'Bring the pipe before 6 PM. Drop-off only.' },
        repair: { fit: 'meets', status: 'business_stated', statement: 'Can repair the joint after a quick look at the shop.', condition: 'Drop-off only; they check the pipe before repairing.' },
        mode: { fit: 'meets', status: 'business_stated', statement: 'Confirmed they don’t do home visits.', condition: 'Drop-off only.' },
      },
    },
  },
  kaveri: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 18s',
      summary: ['Sells parts only; no repairs'],
      answers: {
        repair: { fit: 'does_not_meet', status: 'business_stated', statement: 'Said they only sell parts and don’t do repairs.' },
      },
    },
  },
}
