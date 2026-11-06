// Dentist journey – cross-category check for qualified, conflicting and unattributed evidence.
// OBSERVED: everything in the brief §6 and the Imperial Dental summary/transcript (IMG_1908–1911).
// Call times were not captured, so no timestamps are shown. Follow-up answers are SIMULATED.

import type { Business, CallRecord, Evidence, FollowUpScript, Requirement, SearchRequest, TimelineStep } from '../types'
import { ev, step } from './helpers'

export const dentistRequest: SearchRequest = {
  title: 'Dental cleaning',
  location: 'Kanakapura Road',
  text: 'Dental cleaning near Kanakapura Road, Bengaluru on 3 November 2026, any time. Budget ₹2,000. Paying privately (self-pay).',
  acknowledgement: 'Got it — I’m checking dentists near Kanakapura Road. Here’s what I understood.',
  note: 'This request was given through a 5-step questionnaire. The wording here summarises the answers.',
  interpretation: [
    { label: 'Service', value: 'Dental cleaning' },
    { label: 'Where', value: 'Near Kanakapura Road' },
    { label: 'When', value: '3 Nov 2026', note: 'any time that day' },
    { label: 'Max budget', value: '₹2,000', note: 'total' },
    { label: 'Payment', value: 'Self-pay' },
  ],
}

export const dentistRequirements: Requirement[] = [
  { id: 'service', label: 'Dental cleaning', short: 'Cleaning', kind: 'must_have', question: 'Do you offer a standard dental cleaning?' },
  { id: 'date', label: 'Appointment on 3 Nov 2026', short: 'Slot on 3 Nov', kind: 'must_have', timeSensitive: true, question: 'Do you have a cleaning slot on 3 November? At what time?' },
  { id: 'budget', label: 'Total within ₹2,000', short: 'Price', kind: 'must_have', budget: 2000, question: 'What will the total cost be, including any consultation fee?' },
  { id: 'payment', label: 'Self-pay accepted', short: 'Self-pay', kind: 'must_have', question: 'Can I pay privately, without insurance?' },
]

export const dentistBusinesses: Business[] = [
  {
    id: 'd1', name: 'Dentist in Kanakapura Road', initial: 'D', distanceKm: 2.2, website: 'dentistreebangalore.com', auroraMatch: 100, revealStep: 0, origin: 'observed',
    displayedClaims: ['₹1,200', 'Cleaning available', 'Self-pay accepted', '6:30 PM available', '100% match'],
  },
  {
    id: 'd2', name: 'Special Smiles Dental Clinic', initial: 'S', distanceKm: 1.4, auroraMatch: 100, revealStep: 0, origin: 'observed',
    displayedClaims: ['₹800', 'Cleaning available', 'Appointment on 3 November', 'Card payments accepted', '100% match'],
  },
  {
    id: 'd3', name: 'Happy Client / Imperial Dental', initial: 'I', distanceKm: 3.1, auroraMatch: 100, revealStep: 0, origin: 'observed',
    addressNote: 'Shown in Aurora as “Happy Client Part 5 IMPERIA…”.',
    displayedClaims: ['₹1,250', '5 PM slot', 'Within budget', 'Self-pay', '100% match'],
  },
]

export const dentistCalls: CallRecord[] = [
  {
    id: 'd1-c1', businessId: 'd1', kind: 'original', outcome: 'completed_with_information', at: null, origin: 'observed',
    summary: ['Cleaning starts at ₹800', 'Separate ₹400 consultation fee', 'Final cleaning price depends on examination', 'Appointment availability not confirmed'],
    transcriptNote: 'The transcript appeared to confirm a 6:30 PM appointment. Exact lines were not captured in the research.',
  },
  {
    id: 'd2-c1', businessId: 'd2', kind: 'original', outcome: 'completed_insufficient_information', at: null, duration: '8.77s', origin: 'observed',
    summary: ['No useful information could be gathered'],
  },
  {
    id: 'd3-c1', businessId: 'd3', kind: 'original', outcome: 'completed_with_information', at: null, duration: '57.17s', origin: 'observed',
    summary: ['Superficial dental cleaning with polish available', 'Quoted price 1250 for one appointment', 'Private pay and self-pay both accepted', '5 PM slot offered for today; date differs'],
    transcript: [
      { speaker: 'business', text: 'Hello?', at: '00:00' },
      { speaker: 'aurora', text: 'Hi, do you do dental cleaning?', at: '00:02' },
      { speaker: 'business', text: 'Yes, sir?', at: '00:02' },
      { speaker: 'aurora', text: 'Hi, do you do dental cleaning appointments today?', at: '00:07' },
      { speaker: 'business', text: 'What time you wanted? That enter the company?', at: '00:11' },
      { speaker: 'aurora', text: 'Any time today works. What slots do you have?' },
      { speaker: 'business', text: 'Five o’clock is ok for you? Five PM.', at: '00:20' },
      { speaker: 'aurora', text: 'Five PM works. Is that for a standard teeth cleaning?', at: '00:23' },
      { speaker: 'business', text: 'It’s a superficial claiming, including polished owners will be there.', at: '00:29' },
      { speaker: 'aurora', text: 'Okay, and the cost for that?', at: '00:33' },
      { speaker: 'business', text: 'Thousand two fifty?', at: '00:37' },
      { speaker: 'aurora', text: 'That’s within budget. Do you take private pay or self-pay?', at: '00:38' },
      { speaker: 'business', text: 'Either which one, whichever you are open.', at: '00:44' },
      { speaker: 'aurora', text: 'Great, thanks for the info. I’ll think about it and get back. Bye.', at: '00:47' },
    ],
    transcriptNote: 'AI-generated transcript as shown in Aurora. Note that the call asked about “today”, not 3 November.',
  },
]

export const dentistEvidence: Evidence[] = [
  // Dentist in Kanakapura Road
  ev('d1', 'service', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'Offers dental cleaning.', sourceDetail: 'AI summary', obtainedAt: null, callId: 'd1-c1', origin: 'observed' }),
  ev('d1', 'date', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'The transcript appears to confirm a 6:30 PM appointment.', sourceDetail: 'Call transcript', basis: 'transcript', obtainedAt: null, callId: 'd1-c1', origin: 'observed' }),
  ev('d1', 'date', { source: 'business_call', status: 'insufficient_information', fit: 'unknown', statement: 'The AI summary says appointment availability was not confirmed.', sourceDetail: 'AI summary', obtainedAt: null, callId: 'd1-c1', origin: 'observed' }),
  ev('d1', 'budget', {
    source: 'business_call', status: 'business_stated', fit: 'meets', priceValue: 1200,
    statement: 'Cleaning starts at ₹800, with a separate ₹400 consultation fee.',
    basis: 'calculated',
    details: ['Cleaning: from ₹800 (starting price)', 'Consultation fee: ₹400, charged separately', 'Final cleaning price: set after examination'],
    condition: 'The final cleaning price needs an examination, so the total isn’t known yet. ₹1,200 is only the starting total.',
    sourceDetail: 'AI summary', obtainedAt: null, callId: 'd1-c1', origin: 'observed',
  }),
  ev('d1', 'payment', { source: 'aurora_display', status: 'source_unclear', fit: 'meets', statement: 'Aurora’s result card showed “self-pay accepted”. The call summary doesn’t mention payment.', sourceDetail: 'Aurora result card', obtainedAt: null, origin: 'observed' }),

  // Special Smiles – call gathered nothing; every positive claim is unattributed.
  ev('d2', 'service', { source: 'aurora_display', status: 'source_unclear', fit: 'meets', statement: 'Aurora’s result showed “cleaning available”. Not from the call: the 8.77-second call gathered no useful information.', sourceDetail: 'Aurora result card', obtainedAt: null, origin: 'observed' }),
  ev('d2', 'date', { source: 'aurora_display', status: 'source_unclear', fit: 'meets', statement: 'Aurora’s result showed an appointment on 3 November. No source for this is visible, and the call gathered no useful information.', sourceDetail: 'Aurora result card', obtainedAt: null, origin: 'observed' }),
  ev('d2', 'budget', { source: 'aurora_display', status: 'source_unclear', fit: 'meets', statement: 'Aurora’s result showed ₹800. No source for this is visible, and the call gathered no useful information.', sourceDetail: 'Aurora result card', obtainedAt: null, origin: 'observed' }),
  ev('d2', 'payment', { source: 'aurora_display', status: 'source_unclear', fit: 'meets', statement: 'Aurora’s result showed “card payments accepted”. No source for this is visible, and the call gathered no useful information.', sourceDetail: 'Aurora result card', obtainedAt: null, origin: 'observed' }),

  // Imperial Dental
  ev('d3', 'service', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'Offers a superficial cleaning with polish.', sourceDetail: 'AI summary', obtainedAt: null, callId: 'd3-c1', origin: 'observed' }),
  // A 5 PM slot was offered for "today"; the summary flags the date differs. Availability on 3 Nov is not established.
  ev('d3', 'date', {
    source: 'business_call', status: 'insufficient_information', fit: 'unknown',
    statement: 'Offered a 5 PM slot for “today”. The call summary flags that this date differs from 3 November, so a slot on your date isn’t established.',
    sourceDetail: 'AI summary: “5 PM slot offered for today; date differs”', obtainedAt: null, callId: 'd3-c1', origin: 'observed',
  }),
  ev('d3', 'budget', { source: 'business_call', status: 'business_stated', fit: 'meets', priceValue: 1250, statement: 'Quoted ₹1,250 for one appointment (superficial cleaning with polish).', sourceDetail: 'AI summary', obtainedAt: null, callId: 'd3-c1', origin: 'observed' }),
  ev('d3', 'payment', { source: 'business_call', status: 'business_stated', fit: 'meets', statement: 'Private pay and self-pay are both accepted.', sourceDetail: 'AI summary', obtainedAt: null, callId: 'd3-c1', origin: 'observed' }),
]

export const dentistCountsNote =
  'Aurora showed 50 businesses, 11 websites and 45 calls in one summary, and 61 businesses across 7 sites, 27 called and 61 ranked in another. The research doesn’t explain the difference, so the totals aren’t reconciled here.'

export const dentistTimeline: TimelineStep[] = [
  step('completed', ['done', 'Businesses found'], ['done', 'Calls completed'], ['done', 'Results ranked']),
]

export const dentistScripts: Record<string, Partial<Record<'answered', FollowUpScript>>> = {
  d1: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 39s',
      summary: ['6:30 PM slot on 3 Nov confirmed', 'Total ₹1,200 unless the examination finds more work'],
      answers: {
        date: { fit: 'meets', status: 'business_stated', statement: 'Confirmed a 6:30 PM slot on 3 November.' },
        budget: { fit: 'meets', status: 'business_stated', priceValue: 1200, statement: 'Said the total is ₹1,200 for a standard cleaning.', condition: 'More work found during the examination would cost extra.' },
        payment: { fit: 'meets', status: 'business_stated', statement: 'Said self-pay is fine.' },
      },
    },
  },
  d2: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 44s',
      summary: ['Cleaning available', '11 AM slot on 3 Nov', '₹800 total', 'Cash and cards accepted'],
      answers: {
        service: { fit: 'meets', status: 'business_stated', statement: 'Said they offer a standard cleaning.' },
        date: { fit: 'meets', status: 'business_stated', statement: 'Offered an 11 AM slot on 3 November.' },
        budget: { fit: 'meets', status: 'business_stated', priceValue: 800, statement: 'Said the total is ₹800.' },
        payment: { fit: 'meets', status: 'business_stated', statement: 'Said cash and cards are accepted; no insurance needed.' },
      },
    },
  },
  d3: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 31s',
      summary: ['5 PM slot on 3 Nov confirmed'],
      answers: {
        date: { fit: 'meets', status: 'business_stated', statement: 'Confirmed the 5 PM slot is on 3 November.' },
      },
    },
  },
}
